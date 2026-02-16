import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaIntegration, RestApi, AuthorizationType, TokenAuthorizer, ResponseType } from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';

export interface InfraStackProps extends cdk.StackProps {
  frontendDomain?: string;
  frontendCertArn?: string;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: InfraStackProps) {
    super(scope, id, props);

    // === DynamoDB Table ===
    const tableName = `samverka-${id}-table`;
    const table = new dynamodb.Table(this, 'SamverkaTable', {
      tableName: tableName,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'expiresAt', // V2: Ephemeral Data
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is missing in .env');

    // Define Secret for future migration (User to populate value manually in console)
    const secret = new cdk.aws_secretsmanager.Secret(this, 'JwtSecret', {
      secretName: 'samverka/jwt-secret',
      description: 'JWT Secret for Samverka Auth',
      // We don't set value here to avoid committing it. User sets it in console.
    });

    // === Email (SES) ===
    const domain = props?.frontendDomain || 'samverka.nononsenseconsulting.org';
    const emailIdentity = new cdk.aws_ses.EmailIdentity(this, 'EmailIdentity', {
      identity: cdk.aws_ses.Identity.domain(domain),
    });

    const sourceEmail = `noreply@${domain}`;
    const siteUrl = `https://${domain}`;
    const toOrigin = (value?: string): string | undefined => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed || trimmed === '*') return undefined;
      try {
        const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`https://${trimmed}`);
        return `${url.protocol}//${url.host}`;
      } catch {
        return undefined;
      }
    };
    const allowedOrigins = new Set<string>();
    [siteUrl, process.env.FRONTEND_URL, process.env.SITE_URL]
      .map(toOrigin)
      .filter((origin): origin is string => !!origin)
      .forEach(origin => allowedOrigins.add(origin));
    const corsAllowOriginHeader = `'${siteUrl}'`;

    // === Common Lambda Props ===
    const commonNodeJsProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      environment: {
        TABLE_NAME: tableName,
        JWT_SECRET: jwtSecret,
        SOURCE_EMAIL: sourceEmail,
        FRONTEND_URL: siteUrl
      },
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      timeout: cdk.Duration.seconds(30),
    };

    // === Auth Lambdas ===
    // === Auth Lambdas (Stateless) ===
    const requestAccessLambda = new NodejsFunction(this, 'RequestAccessFunction', {
      entry: path.join(__dirname, '../../backend/src/auth/request-access.ts'),
      ...commonNodeJsProps,
    });

    const verifyAccessLambda = new NodejsFunction(this, 'VerifyAccessFunction', {
      entry: path.join(__dirname, '../../backend/src/auth/verify-access.ts'),
      ...commonNodeJsProps,
    });

    const resendLinkLambda = new NodejsFunction(this, 'ResendLinkFunction', {
      entry: path.join(__dirname, '../../backend/src/auth/resend-link.ts'),
      ...commonNodeJsProps,
    });

    const authorizerLambda = new NodejsFunction(this, 'AuthorizerFunction', {
      entry: path.join(__dirname, '../../backend/src/auth/authorizer.ts'),
      ...commonNodeJsProps,
    });

    // Grant permissions
    table.grantReadWriteData(requestAccessLambda);
    table.grantReadWriteData(verifyAccessLambda);
    table.grantReadWriteData(resendLinkLambda);

    // === API Gateway ===
    const api = new RestApi(this, 'SamverkaApi', {
      restApiName: 'Samverka API',
      defaultCorsPreflightOptions: {
        allowOrigins: Array.from(allowedOrigins), // Explicit allowlist only
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    api.addGatewayResponse('Cors4xx', {
      type: ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': corsAllowOriginHeader,
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'"
      }
    });

    api.addGatewayResponse('Cors5xx', {
      type: ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': corsAllowOriginHeader,
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'"
      }
    });

    const authorizer = new TokenAuthorizer(this, 'SamverkaAuthorizer', {
      handler: authorizerLambda,
      resultsCacheTtl: cdk.Duration.seconds(300), // Enabled for production optimization
    });

    const auth = api.root.addResource('auth');

    // POST /auth/request-access
    auth.addResource('request-access').addMethod('POST', new LambdaIntegration(requestAccessLambda));

    // POST /auth/verify
    auth.addResource('verify').addMethod('POST', new LambdaIntegration(verifyAccessLambda));

    // POST /auth/resend
    auth.addResource('resend').addMethod('POST', new LambdaIntegration(resendLinkLambda));

    // === Meeting Lambdas ===
    const createMeetingLambda = new NodejsFunction(this, 'CreateMeetingFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/createMeeting.ts'),
      ...commonNodeJsProps,
    });

    const listMeetingsLambda = new NodejsFunction(this, 'ListMeetingsFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/listMeetings.ts'),
      ...commonNodeJsProps,
    });

    const getMeetingLambda = new NodejsFunction(this, 'GetMeetingFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/getMeeting.ts'),
      ...commonNodeJsProps,
    });

    const castVoteLambda = new NodejsFunction(this, 'CastVoteFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/castVote.ts'),
      ...commonNodeJsProps,
    });

    const deleteMeetingLambda = new NodejsFunction(this, 'DeleteMeetingFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/deleteMeeting.ts'),
      ...commonNodeJsProps,
    });

    const updateMeetingLambda = new NodejsFunction(this, 'UpdateMeetingFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/updateMeeting.ts'),
      ...commonNodeJsProps,
    });

    const decideMeetingLambda = new NodejsFunction(this, 'DecideMeetingFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/decideMeeting.ts'),
      ...commonNodeJsProps,
    });

    // Public access lambdas (no authorizer)
    const getPublicMeetingLambda = new NodejsFunction(this, 'GetPublicMeetingFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/getPublicMeeting.ts'),
      ...commonNodeJsProps,
    });

    const castPublicVoteLambda = new NodejsFunction(this, 'CastPublicVoteFunction', {
      entry: path.join(__dirname, '../../backend/src/scheduler/lambdas/castPublicVote.ts'),
      ...commonNodeJsProps,
    });

    table.grantReadWriteData(createMeetingLambda);
    table.grantReadData(listMeetingsLambda);
    table.grantReadData(getMeetingLambda);
    table.grantReadWriteData(castVoteLambda);
    table.grantReadWriteData(deleteMeetingLambda);
    table.grantReadWriteData(updateMeetingLambda);
    table.grantReadWriteData(decideMeetingLambda);
    table.grantReadData(getPublicMeetingLambda);
    table.grantReadWriteData(castPublicVoteLambda);
    // === Chat Lambdas ===
    const sendMessageLambda = new NodejsFunction(this, 'SendMessageFunction', {
      entry: path.join(__dirname, '../../backend/src/communication/lambdas/sendMessage.ts'),
      ...commonNodeJsProps,
    });

    const getMessagesLambda = new NodejsFunction(this, 'GetMessagesFunction', {
      entry: path.join(__dirname, '../../backend/src/communication/lambdas/getMessages.ts'),
      ...commonNodeJsProps,
    });

    const createRoomLambda = new NodejsFunction(this, 'CreateRoomFunction', {
      entry: path.join(__dirname, '../../backend/src/communication/lambdas/createRoom.ts'),
      ...commonNodeJsProps,
    });

    const listRoomsLambda = new NodejsFunction(this, 'ListRoomsFunction', {
      entry: path.join(__dirname, '../../backend/src/communication/lambdas/listRooms.ts'),
      ...commonNodeJsProps,
    });

    const deleteMessageLambda = new NodejsFunction(this, 'DeleteMessageFunction', {
      entry: path.join(__dirname, '../../backend/src/communication/lambdas/deleteMessage.ts'),
      ...commonNodeJsProps,
    });

    const deleteRoomLambda = new NodejsFunction(this, 'DeleteRoomFunction', {
      entry: path.join(__dirname, '../../backend/src/communication/lambdas/deleteRoom.ts'),
      ...commonNodeJsProps,
    });

    const listUsersLambda = new NodejsFunction(this, 'ListUsersFunction', {
      entry: path.join(__dirname, '../../backend/src/communication/lambdas/listUsers.ts'),
      ...commonNodeJsProps,
    });

    table.grantReadWriteData(sendMessageLambda);
    table.grantReadData(getMessagesLambda);
    table.grantReadWriteData(createRoomLambda);
    table.grantReadData(listRoomsLambda);
    table.grantReadWriteData(deleteMessageLambda);
    table.grantReadWriteData(deleteRoomLambda);
    table.grantReadData(listUsersLambda);

    // === User Routes ===
    const users = api.root.addResource('users');

    // GET /users (List users for DM functionality)
    users.addMethod('GET', new LambdaIntegration(listUsersLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // === Meeting Routes ===
    const meetings = api.root.addResource('meetings');

    // POST /meetings (Public endpoint - no authentication required for Zero-Friction)
    meetings.addMethod('POST', new LambdaIntegration(createMeetingLambda));

    // GET /meetings (List my meetings)
    meetings.addMethod('GET', new LambdaIntegration(listMeetingsLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    const meetingById = meetings.addResource('{id}');

    // GET /meetings/{id}
    meetingById.addMethod('GET', new LambdaIntegration(getMeetingLambda), {
      authorizer, // Protect it so we can identify user
      authorizationType: AuthorizationType.CUSTOM,
    });

    // DELETE /meetings/{id}
    meetingById.addMethod('DELETE', new LambdaIntegration(deleteMeetingLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // PATCH /meetings/{id} (Update details)
    meetingById.addMethod('PATCH', new LambdaIntegration(updateMeetingLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // POST /meetings/{id}/decide (Lock/Decide time)
    meetingById.addResource('decide').addMethod('POST', new LambdaIntegration(decideMeetingLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // Voting
    const votes = api.root.addResource('votes');
    votes.addMethod('POST', new LambdaIntegration(castVoteLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // === Public Routes (NO authorizer) ===
    const publicResource = api.root.addResource('public');
    const publicMeetings = publicResource.addResource('meetings');
    const publicMeetingById = publicMeetings.addResource('{id}');

    // GET /public/meetings/{id}
    publicMeetingById.addMethod('GET', new LambdaIntegration(getPublicMeetingLambda));

    const publicVotes = publicResource.addResource('votes');
    // POST /public/votes
    publicVotes.addMethod('POST', new LambdaIntegration(castPublicVoteLambda));

    // === Chat Routes ===
    const chat = api.root.addResource('chat');
    const messages = chat.addResource('messages');
    const rooms = chat.addResource('rooms'); // /chat/rooms

    // POST /chat/rooms (Create)
    rooms.addMethod('POST', new LambdaIntegration(createRoomLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // GET /chat/rooms (List)
    rooms.addMethod('GET', new LambdaIntegration(listRoomsLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    const roomById = rooms.addResource('{roomId}');
    roomById.addMethod('DELETE', new LambdaIntegration(deleteRoomLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // POST /chat/messages
    messages.addMethod('POST', new LambdaIntegration(sendMessageLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // DELETE /chat/messages (Body: { roomId, timestamp })
    messages.addMethod('DELETE', new LambdaIntegration(deleteMessageLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // GET /chat/messages/{roomId}
    const messagesByRoom = messages.addResource('{roomId}');
    messagesByRoom.addMethod('GET', new LambdaIntegration(getMessagesLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });

    // === Frontend Hosting (S3 + CloudFront) ===
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For MVP/Dev only
      autoDeleteObjects: true, // For MVP/Dev only
    });

    let certificate: acm.ICertificate | undefined = undefined;
    if (props?.frontendCertArn) {
      certificate = acm.Certificate.fromCertificateArn(this, 'FrontendCert', props.frontendCertArn);
    }

    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://*.amazonaws.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com;",
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
      },
    });

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket), // Automatically creates OAC
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: securityHeaders,
      },
      domainNames: props?.frontendDomain ? [props.frontendDomain] : undefined,
      certificate: certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Grant sending permission
    // emailIdentity.grantSendEmail(requestLinkLambda);
    // === API Usage Plan (Rate Limiting) ===
    const plan = api.addUsagePlan('UsagePlan', {
      name: 'Standard',
      throttle: {
        rateLimit: 10,
        burstLimit: 20
      }
    });

    plan.addApiStage({
      stage: api.deploymentStage,
    });

    // Explicitly grant permission to send to ANY resource (needed for Sandbox verification testing)
    const sesPolicy = new cdk.aws_iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
      effect: cdk.aws_iam.Effect.ALLOW,
    });

    requestAccessLambda.addToRolePolicy(sesPolicy);
    resendLinkLambda.addToRolePolicy(sesPolicy);
    createMeetingLambda.addToRolePolicy(sesPolicy);
    decideMeetingLambda.addToRolePolicy(sesPolicy);


    // === Outputs ===
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'FrontendBucketName', { value: frontendBucket.bucketName });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'CloudFrontDomainName', { value: distribution.distributionDomainName });
  }
}
