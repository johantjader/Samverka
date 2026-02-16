import { useState } from 'react';

export default function Footer() {
    const [showGDPRModal, setShowGDPRModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);

    return (
        <>
            <footer className="border-t border-nnc-subtle bg-nnc-base py-8 px-4 text-sm text-nnc-muted">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Left Section - Links */}
                    <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                        <button
                            onClick={() => setShowGDPRModal(true)}
                            className="hover:text-nnc-primary transition-colors"
                        >
                            Så här behandlar vi din data
                        </button>
                        <span className="text-nnc-subtle">•</span>
                        <button
                            onClick={() => setShowAboutModal(true)}
                            className="hover:text-nnc-primary transition-colors"
                        >
                            Om tjänsten Samverka
                        </button>
                        <span className="text-nnc-subtle">•</span>
                        <a
                            href="https://github.com/sponsors/nononsenseconsulting"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-nnc-primary transition-colors"
                        >
                            Ge ett bidrag
                        </a>
                    </div>

                    {/* Right Section - Credit */}
                    <div className="text-center md:text-right">
                        En tjänst av{' '}
                        <a
                            href="https://www.nononsenseconsulting.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-accent-tech hover:text-opacity-80 transition-colors"
                        >
                            NoNonsenseConsulting
                        </a>
                    </div>
                </div>
            </footer>

            {/* GDPR Modal */}
            {showGDPRModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                    <div className="bg-nnc-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-nnc-subtle">
                        <div className="sticky top-0 bg-nnc-surface border-b border-nnc-subtle p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-nnc-primary">Så här behandlar vi din data</h2>
                            <button
                                onClick={() => setShowGDPRModal(false)}
                                className="text-nnc-muted hover:text-nnc-primary text-3xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 prose max-w-none text-nnc-primary">
                            <h3>Minimal Data Collection</h3>
                            <p>
                                Samverka samlar in endast den data som är absolut nödvändig för att tjänsten ska fungera:
                            </p>
                            <ul>
                                <li><strong>E-postadress:</strong> För att skicka magic links och mötesnotiser</li>
                                <li><strong>Namn:</strong> För att identifiera deltagare i möten</li>
                                <li><strong>Mötesdata:</strong> Titel, beskrivning, tidsförslag och röster</li>
                            </ul>

                            <h3>Automatisk Radering (Ephemeral Data)</h3>
                            <p>
                                All data raderas automatiskt genom DynamoDB TTL (Time To Live):
                            </p>
                            <ul>
                                <li>Möten raderas 60 dagar efter skapande</li>
                                <li>Om mötet bestäms raderas allt 14 dagar efter beslutet</li>
                                <li>Ingen data sparas permanent</li>
                            </ul>

                            <h3>Ingen Tracking eller Profilering</h3>
                            <p>
                                Vi använder <strong>inga cookies</strong>, ingen analytics och ingen tracking.
                                Vi bygger inga användarprofiler.
                            </p>

                            <h3>Datalagring</h3>
                            <p>
                                All data lagras i AWS DynamoDB (EU-region: Stockholm, eu-north-1) och överförs
                                krypterat via HTTPS.
                            </p>

                            <h3>Kontakt</h3>
                            <p>
                                För frågor om dataskydd, kontakta{' '}
                                <a href="mailto:privacy@nononsenseconsulting.org">
                                    privacy@nononsenseconsulting.org
                                </a>
                            </p>
                        </div>
                        <div className="sticky bottom-0 bg-nnc-base border-t border-nnc-subtle p-4 flex justify-end">
                            <button
                                onClick={() => setShowGDPRModal(false)}
                                className="px-4 py-2 bg-accent-action text-white rounded-lg hover:bg-opacity-90 transition-all"
                            >
                                Stäng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* About Modal */}
            {showAboutModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                    <div className="bg-nnc-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-nnc-subtle">
                        <div className="sticky top-0 bg-nnc-surface border-b border-nnc-subtle p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-nnc-primary">Om tjänsten Samverka</h2>
                            <button
                                onClick={() => setShowAboutModal(false)}
                                className="text-nnc-muted hover:text-nnc-primary text-3xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 prose max-w-none text-nnc-primary">
                            <h3>Friktionsfri möteskoordinering för moderna team</h3>
                            <p>
                                Samverka är en <strong>open-source</strong> plattform för mötesbokning utan krångel.
                                Vi tror att verktyg för samarbete ska vara enkla, snabba och respektera din integritet.
                            </p>

                            <h3>Zero-Friction Filosofi</h3>
                            <ul>
                                <li><strong>Inga konton:</strong> Användare får en magic link via e-post</li>
                                <li><strong>Ingen registrering:</strong> Skapa möte direkt från startsidan</li>
                                <li><strong>Ephemeral data:</strong> All data raderas automatiskt</li>
                                <li><strong>Open Source:</strong> Koden är fri och granskningsbar</li>
                            </ul>

                            <h3>Hur fungerar det?</h3>
                            <ol>
                                <li>Skapa ett möte med tidsförslag</li>
                                <li>Få en admin-länk via e-post</li>
                                <li>Bjud in deltagare (får egna länkar)</li>
                                <li>Alla röstar på tider som passar</li>
                                <li>Du bestämmer vilken tid som gäller</li>
                                <li>Kalenderinbjudan skickas automatiskt (.ics)</li>
                            </ol>

                            <h3>Teknologi</h3>
                            <p>
                                Samverka är byggt med React, TypeScript, AWS Lambda och DynamoDB.
                                Hela infrastrukturen definieras som kod (AWS CDK) och kan deployas på 5 minuter.
                            </p>

                            <h3>Open Source</h3>
                            <p>
                                Projektet är licensierat under Apache 2.0 och källkoden finns på{' '}
                                <a href="https://github.com/johantjader/samverka" target="_blank" rel="noopener noreferrer">
                                    GitHub
                                </a>.
                            </p>
                        </div>
                        <div className="sticky bottom-0 bg-nnc-base border-t border-nnc-subtle p-4 flex justify-end">
                            <button
                                onClick={() => setShowAboutModal(false)}
                                className="px-4 py-2 bg-accent-action text-white rounded-lg hover:bg-opacity-90 transition-all"
                            >
                                Stäng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
