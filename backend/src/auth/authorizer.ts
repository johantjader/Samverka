import { APIGatewayTokenAuthorizerHandler } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

const generatePolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string, context?: any) => {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource
            }]
        },
        context
    };
};

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
    try {
        const token = event.authorizationToken.replace('Bearer ', '');
        const methodArn = event.methodArn;

        if (!token) {
            return generatePolicy('user', 'Deny', methodArn);
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET missing");

        try {
            const decoded = jwt.verify(token, secret) as any;

            // Allow access to all resources for now (simplifies "methodArn" wildcards)
            // Or restrict based on meetingId matching path parameters?
            // For now, simple validation.

            return generatePolicy(decoded.sub || decoded.email, 'Allow', '*', {
                meetingId: decoded.meetingId,
                email: decoded.email,
                displayName: decoded.displayName || decoded.email,
                role: decoded.role
            });

        } catch (e) {
            console.log("Token invalid");
            return generatePolicy('user', 'Deny', methodArn);
        }
    } catch (error) {
        console.log("Authorizer error:", error);
        throw new Error("Unauthorized");
    }
};
