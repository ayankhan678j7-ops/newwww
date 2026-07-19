import React from 'react';
import { Bullet, P, Section, StaticPage } from '@/src/components/StaticPage';

export default function PrivacyPolicy() {
  return (
    <StaticPage title="Privacy Policy" testID="privacy-page">
      <P>Last updated: 19 July 2026</P>
      <Section title="1. Introduction">
        <P>JARVIS AI (“we”, “our”, “the app”) is committed to protecting your privacy. This policy explains what data we collect, how we use it, and the controls you have.</P>
      </Section>
      <Section title="2. Data we collect">
        <Bullet>Account: name, email (if you sign up with email or Google).</Bullet>
        <Bullet>Chat & memory: messages you send and memories you save.</Bullet>
        <Bullet>Voice: audio you record (transient — sent to Sarvam AI for transcription and immediately discarded on the client).</Bullet>
        <Bullet>Device: minimal diagnostic info to keep the app stable.</Bullet>
      </Section>
      <Section title="3. How we use your data">
        <Bullet>To provide replies via Sarvam AI (LLM, TTS, STT) and search via Tavily.</Bullet>
        <Bullet>To remember what you tell us across sessions (Memory feature — you can disable or delete it).</Bullet>
        <Bullet>To keep your account signed in securely.</Bullet>
      </Section>
      <Section title="4. Data sharing">
        <P>We do not sell your data. We share only what is needed with third-party AI providers (Sarvam AI, Tavily) strictly to fulfil your request. We do not train models on your data.</P>
      </Section>
      <Section title="5. Your controls">
        <Bullet>Sign out at any time.</Bullet>
        <Bullet>View, edit, and delete your memory from the Memory tab.</Bullet>
        <Bullet>Delete your account permanently (Profile → Delete account) — this wipes your user, memories, and chat history.</Bullet>
      </Section>
      <Section title="6. Google Play compliance">
        <P>We follow Google Play Data Safety and User Data policies. We never auto-send messages, make/answer calls, record calls, or monitor activity in the background.</P>
      </Section>
      <Section title="7. Children">
        <P>The app is not directed to children under 13. Parents must supervise usage by minors.</P>
      </Section>
      <Section title="8. Contact">
        <P>Questions or requests? Email support@jarvis.ai from the address associated with your account.</P>
      </Section>
    </StaticPage>
  );
}
