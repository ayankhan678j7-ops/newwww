import React from 'react';
import { Bullet, P, Section, StaticPage } from '@/src/components/StaticPage';

export default function Terms() {
  return (
    <StaticPage title="Terms & Conditions" testID="terms-page">
      <P>Last updated: 19 July 2026</P>
      <Section title="1. Acceptance">
        <P>By using JARVIS AI you agree to these Terms. If you do not agree, please do not use the app.</P>
      </Section>
      <Section title="2. Use of the service">
        <Bullet>You are 13+ (or the age of digital consent in your jurisdiction).</Bullet>
        <Bullet>You will not use the app to break the law, spread abuse, or harm others.</Bullet>
        <Bullet>You are responsible for the content you input and share.</Bullet>
      </Section>
      <Section title="3. Not professional advice">
        <P>Health, Finance, Legal, Tax, and Investment features provide GENERAL INFORMATION ONLY. They are not a substitute for a licensed professional. Always consult a qualified expert before making decisions.</P>
      </Section>
      <Section title="4. AI limitations">
        <P>JARVIS AI can make mistakes and may generate incorrect or outdated information. Verify important facts. We do not guarantee accuracy, availability, or fitness for a particular purpose.</P>
      </Section>
      <Section title="5. Third-party services">
        <P>The app relies on third-party AI providers (Sarvam AI, Tavily) and Firebase. Their availability and terms may affect the app.</P>
      </Section>
      <Section title="6. Communication assistant">
        <P>The Communication assistant DRAFTS messages only. It never sends messages on your behalf; sending is done manually via your device's share options.</P>
      </Section>
      <Section title="7. Termination">
        <P>You may delete your account at any time. We may suspend accounts that abuse the service or violate these Terms.</P>
      </Section>
      <Section title="8. Changes">
        <P>We may update these Terms as the app evolves. Continued use after updates means you accept the changes.</P>
      </Section>
      <Section title="9. Contact">
        <P>Email support@jarvis.ai for questions.</P>
      </Section>
    </StaticPage>
  );
}
