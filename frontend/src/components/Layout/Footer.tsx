import { useState } from 'react';

export default function Footer() {
    const [showGDPRModal, setShowGDPRModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    return (
        <>
            <footer className="border-t border-nnc-subtle bg-nnc-base py-8 px-4 text-sm text-nnc-muted">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Left Section - Links */}
                    <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                        <span className="text-xs font-mono font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded-full">
                            BETA
                        </span>
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
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="hover:text-nnc-primary transition-colors"
                        >
                            Rapportera problem
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
                        <div className="p-6 space-y-6 text-nnc-primary">
                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Minimal datainsamling</h3>
                                <p className="text-nnc-muted mb-3">
                                    Samverka samlar in endast den data som är absolut nödvändig för att tjänsten ska fungera:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-nnc-muted">
                                    <li><strong className="text-nnc-primary">E-postadress:</strong> För att skicka magic links och mötesnotiser</li>
                                    <li><strong className="text-nnc-primary">Namn:</strong> För att identifiera deltagare i möten</li>
                                    <li><strong className="text-nnc-primary">Mötesdata:</strong> Titel, beskrivning, tidsförslag och röster</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Automatisk radering</h3>
                                <p className="text-nnc-muted mb-3">
                                    All data raderas automatiskt genom DynamoDB TTL (Time To Live):
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-nnc-muted">
                                    <li>Möten raderas 60 dagar efter skapande</li>
                                    <li>Om mötet bestäms raderas allt 14 dagar efter beslutet</li>
                                    <li>Ingen data sparas permanent</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Ingen tracking eller profilering</h3>
                                <p className="text-nnc-muted">
                                    Vi använder <strong className="text-nnc-primary">inga cookies</strong>, ingen analytics och ingen tracking.
                                    Vi bygger inga användarprofiler.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Datalagring</h3>
                                <p className="text-nnc-muted">
                                    All data lagras i AWS DynamoDB (EU-region: Stockholm, eu-north-1) och överförs
                                    krypterat via HTTPS.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Kontakt</h3>
                                <p className="text-nnc-muted">
                                    För frågor om dataskydd, kontakta{' '}
                                    <a href="mailto:privacy@nononsenseconsulting.org" className="text-accent-tech hover:text-accent-tech/80 underline">
                                        privacy@nononsenseconsulting.org
                                    </a>
                                </p>
                            </div>
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
                        <div className="p-6 space-y-6 text-nnc-primary">
                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Enkel mötesbokning utan krångel</h3>
                                <p className="text-nnc-muted">
                                    Samverka är en <strong className="text-nnc-primary">open-source</strong> plattform för mötesbokning.
                                    Verktyg för samarbete ska vara enkla, snabba och respektera din integritet.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Grundprinciper</h3>
                                <ul className="list-disc list-inside space-y-1 text-nnc-muted">
                                    <li><strong className="text-nnc-primary">Inga konton:</strong> Användare får en magic link via e-post</li>
                                    <li><strong className="text-nnc-primary">Ingen registrering:</strong> Skapa möte direkt från startsidan</li>
                                    <li><strong className="text-nnc-primary">Ephemeral data:</strong> All data raderas automatiskt</li>
                                    <li><strong className="text-nnc-primary">Open Source:</strong> Koden är fri och granskningsbar</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Hur fungerar det?</h3>
                                <ol className="list-decimal list-inside space-y-1 text-nnc-muted">
                                    <li>Skapa ett möte med tidsförslag</li>
                                    <li>Få en admin-länk via e-post</li>
                                    <li>Bjud in deltagare (får egna länkar)</li>
                                    <li>Alla röstar på tider som passar</li>
                                    <li>Du bestämmer vilken tid som gäller</li>
                                    <li>Kalenderinbjudan skickas automatiskt (.ics)</li>
                                </ol>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Teknologi</h3>
                                <p className="text-nnc-muted">
                                    Samverka är byggt med React, TypeScript, AWS Lambda och DynamoDB.
                                    Hela infrastrukturen definieras som kod (AWS CDK).
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-nnc-primary mb-2">Open Source</h3>
                                <p className="text-nnc-muted">
                                    Projektet är licensierat under Apache 2.0 och källkoden finns på{' '}
                                    <a href="https://github.com/johantjader/samverka" target="_blank" rel="noopener noreferrer" className="text-accent-tech hover:text-accent-tech/80 underline">
                                        GitHub
                                    </a>.
                                </p>
                            </div>
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

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                    <div className="bg-nnc-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-nnc-subtle">
                        <div className="sticky top-0 bg-nnc-surface border-b border-nnc-subtle p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-nnc-primary">Rapportera problem eller föreslå förbättringar</h2>
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="text-nnc-muted hover:text-nnc-primary text-3xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 space-y-4 text-nnc-primary">
                            <p className="text-nnc-muted">
                                Samverka är ett open source-projekt under aktiv utveckling. Vi uppskattar all feedback!
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-nnc-muted">
                                <li><strong className="text-nnc-primary">Hittat en bugg?</strong> Beskriv vad som hände och vad du förväntade dig.</li>
                                <li><strong className="text-nnc-primary">Har du en idé?</strong> Föreslå förbättringar eller nya funktioner.</li>
                            </ul>
                            <p className="text-nnc-muted">
                                Skapa en <strong className="text-nnc-primary">issue</strong> på GitHub så tittar vi på det.
                            </p>
                        </div>
                        <div className="sticky bottom-0 bg-nnc-base border-t border-nnc-subtle p-4 flex justify-between">
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="px-4 py-2 text-nnc-muted hover:text-nnc-primary transition-colors"
                            >
                                Stäng
                            </button>
                            <a
                                href="https://github.com/johantjader/Samverka/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-accent-action text-white rounded-lg hover:bg-opacity-90 transition-all inline-flex items-center gap-2"
                            >
                                Öppna GitHub Issues
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
