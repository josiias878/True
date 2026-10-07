# Privacy Policy – Kolbi · Supplement Lab

This is a translation for convenience; the German version is legally binding.

> **DRAFT** – have it reviewed by a professional before publication. Placeholders in [square brackets].

Last updated: October 2026 · applies to the website, the web app and the store apps (iPhone, Android) from version 1.0

## 1. Controller

[Vorname Nachname]
[Straße Hausnummer]
[PLZ Ort]
Email: [E-Mail-Adresse]

## 2. Principle: your entries stay on your device

Supplement Lab works without an account and without signing in. A pseudonymous social account without an email
address only exists if you switch on the optional social features (section 8a). Everything you enter – supplements, intakes,
check-ins, ratings, side effects, notes, stock, prices, goals – is stored **only locally on your device** (browser
storage or app storage). We have no access to it. If you delete the app or choose “Reset” in the settings, the data
is gone. You can save or share a backup as a file yourself; you decide where the file goes.

**System backups:** On iPhone, the operating system may include app data – including your Kolbi entries – in a
device backup (iCloud Backup or a backup on your Mac/PC) if you have turned such backups on in your device settings.
You manage that backup with Apple or on your computer; we have no access to it, and restoring such a backup can bring
the entries back. In the Android app, system backup is turned off for Kolbi: your entries are not included in a
Google backup and are not transferred when you move to a new device.

Data is sent to a server only in these cases:

- **no switch, technically necessary:** delivery of the website and web app (section 4) and, in the store apps,
  purchase verification via RevenueCat (section 10);
- **on by default, can be turned off at any time:** the anonymous usage stats without a device ID (section 5);
- **only if you use or switch on the feature yourself:** push reminders in the web app (section 6), calendar
  subscription (section 7), community (section 8, with explicit consent), social features (section 8a, with
  explicit consent) and feedback (section 9).

**Not included:** version 1.0 does not read any data from Apple Health or Google Health Connect. If such a connection
is offered later, we will update this policy beforehand; it would only become active after your explicit consent in
the app and in your device’s system settings. There is also no advertising, no advertising ID, no advertising or
tracking SDKs, no location data and no access to contacts, camera, microphone or your calendar.

## 3. Storage on your device (Section 25 TDDDG)

The app stores data in your device’s local storage and reads it back: your entries and settings and – only if you use
the respective feature – random identifiers for the community (section 8), social features (profile ID and device key,
section 8a), calendar subscription (section 7) and web push (section 6). This storage is **strictly necessary** so that the app can provide the feature you asked for
(Section 25(2) no. 2 of the German TDDDG); no consent is required for it. In the store apps, RevenueCat’s purchase
system stores a random app user ID on the device (section 10). For the stats, see section 5. We don’t set cookies for
advertising or analytics purposes.

## 4. Delivery of the website and web app (hosting)

The website and the web app are delivered via **Vercel Inc.**, 340 S Lemon Ave #4133, Walnut, CA 91789, USA. When
you access them, Vercel processes technically necessary data (IP address, time, requested file, browser type) in
server logs in order to deliver the site and protect it against misuse. Legal basis: Art. 6(1)(f) GDPR (legitimate
interest in secure, functioning delivery). Vercel is certified under the EU-US Data Privacy Framework. The store apps
ship their own files; Vercel is only involved there when you open a link to our website from the app (e.g. this
policy).

**Audience measurement (website and web app only):** We use Vercel Web Analytics in its cookieless variant. Only
aggregated page views are evaluated (e.g. “342 visits this week”, also per link such as `/reddit`) – no cookies, no
cross-device profiles, no content from the app. Legal basis: Art. 6(1)(f) GDPR (legitimate interest in knowing which
pages and paths are used). Vercel Web Analytics is not built into the store apps.

## 5. Anonymous usage stats (web app and store apps, on by default, can be turned off)

So we can see whether the app helps and which paths lead people to it, the app reports single events, e.g. “setup
completed”, “first check-in”, “7th check-in”, “weekly recap opened”, “plans viewed”, “purchase completed”. Only the
event, the app language and – if you came through a link like `…/reddit` – the channel name, or in test versions (beta) without such a link a fixed test channel (e.g. “playtest”), are sent. So that the channel is also counted for later events, the app
remembers it locally on your device, as well as your setting for whether the stats are off.

At Supabase (Frankfurt, section 11) this only increments a **daily counter** (e.g. “Oct 1 · first check-in ·
English · reddit: 12”). Only the day, event, language, channel and count are stored – **no device ID, no IP address, no content and no health values**; individual people cannot be identified in the stats.

The stats are **switched on by default**. You can turn them off at any time in Settings under “📊 Anonymous stats”;
after that, the app sends no more events. Legal basis: Art. 6(1)(f) GDPR (legitimate interest in improving the app);
you can object at any time with the switch.

> **Draft – to be clarified by a professional:** Whether storing the channel and the stats setting locally for the counting requires consent under Section 25 TDDDG (then: stats only after opt-in), or whether the legitimate interest with an opt-out is sufficient, will be reviewed before publication. This section will be updated afterwards.

## 6. Push reminders (web app only, optional)

**Store apps:** reminders are scheduled as **local notifications** directly on your device. Nothing is sent to us or
to a push server.

**Web app:** if you switch on push reminders there, we store the following with Supabase (Frankfurt):

- your browser’s push address including the technical keys used to encrypt the message (assigned by your browser’s
  or operating system’s push service, e.g. Apple, Google or Mozilla),
- the scheduled times of your reminders for the next few days (at most 14) with **neutral texts** (e.g. “Time for
  your supplements”, “Your weekly recap is ready”).

The names of your supplements and your health information are **not** transferred – your device only inserts the
personal texts locally when the message arrives. To deliver the message, we pass the encrypted message on to your
browser’s push service. Sent entries are deleted after 2 days at the latest; the push address is deleted when you
switch the feature off or as soon as the push service reports it as invalid.
Legal basis: Art. 6(1)(a) GDPR (consent by switching it on), which you can withdraw at any time by switching it off
in the app or in your browser’s or device’s notification settings.

## 7. Calendar subscription (optional)

If you use the calendar subscription, your device generates a random identifier (token) and uploads a calendar file
with your major events (e.g. “A test result is ready”, “Last test day”) to Supabase (Frankfurt). By default, the
events contain **no supplement names**; the names are only included if you activate “Show supplement names in calendar”. Your
calendar app regularly fetches this file via the subscription link; we store the time of the last fetch. Anyone who
knows the link can fetch the file – so don’t share it. “End subscription” deletes the file and makes the link
invalid. If you delete the app without ending the subscription, the file remains; in that case send us the
subscription link and we will delete it (without the link, we cannot link it to any person).
Legal basis: Art. 6(1)(a) GDPR; if supplement names are included, additionally Art. 9(2)(a) GDPR (explicit consent by
activating the switch). You can withdraw at any time via “End subscription”.

## 8. Community “What others experienced” (optional, with explicit consent)

Only if you agree, the following result is transferred to Supabase (Frankfurt) after a completed test:

- which supplement from the library was tested (never your own entries),
- test duration in days, your verdict (keep / maybe / out),
- the change in your ratings compared with your reset phase (overall and per area),
- identifiers of side effects that occurred (e.g. “headache”),
- a random device identifier, so that a new result replaces your old one instead of duplicating it, and so that you
  can delete your contributions.

**No names, no account, no calendar dates and no notes** are transferred. Because this is information about your
well-being, it may count as health data; it is therefore processed only on the basis of your **explicit consent**
(Art. 6(1)(a) and Art. 9(2)(a) GDPR). The data is pseudonymous: we cannot link it to any person. It is only shown in
aggregated form and only once there are at least 5 contributions per supplement (shares, average, distribution). The
contributions remain stored until you delete them. You can withdraw your consent at any time in the settings and
remove all your contributions there with “Delete my shared results”.

To show the aggregated numbers, the app fetches them from Supabase. Nothing about you is stored in the process.

You don’t need a social account for this anonymous sharing. If you also share a result as a result post in the social
features, section 8a applies: the post is then visible to other users of the app under your pseudonym.

## 8a. Social features (optional, with explicit consent)

If you switch on the social features in the app, you can share result posts under a pseudonym, follow others, react
and join communities. Nothing is transferred for this without your consent; all other features of the app work
without it. The social features are for people aged 18 and over.

**Purpose:** sharing your test results with other users of the app under a pseudonym, following their results and
reacting to them – and protecting the community against spam and abuse (reporting, blocking, moderation).

The following is stored with Supabase (Frankfurt, section 11):

- **Social account without email:** a random profile ID and a hashed (non-reversible) value of a secret key that only
  your device knows. No name, no email address, no phone number, no password.
- **Profile:** a pseudonym that the app generates from fixed word lists (you cannot enter your own text) and your
  Kolbi avatar (colour, accessory, mood).
- **Result posts you share:** which supplement from the library was tested, test duration, your verdict (keep / maybe
  / out) and the difference in your ratings compared with your reset phase (overall and per area). **No daily data
  and no notes.**
- **Following:** whom you follow and who follows you.
- **Reactions:** which reaction (“Keep going”, “Helpful”) you gave on which post.
- **Communities:** which predefined communities you have joined (labs for a supplement or goal communities such as
  sleep or focus).
- **Reports and blocks:** what you reported, with the reason from a predefined list, and whom you blocked.
- **Moderation:** if we hide content or suspend an account, the decision with its reason.
- in each case, the time something was created, and the day of your last visit (date only);
- technical counters against abuse (number of your actions per minute), deleted after 2 days at the latest.

**Visibility:** your pseudonym, avatar, result posts and activity (following, reactions, community memberships) are
visible to **other users of the app – always only under your pseudonym**. We don’t publish them outside the app, e.g.
on our website. Only we see reports; nobody except you and us sees your blocks. We don’t know your name. If you tell
someone your pseudonym, that person can link your shared results to you – think about this beforehand.

**Legal basis:** your consent (Art. 6(1)(a) GDPR). Because results and community memberships may allow conclusions
about your health, we ask for your **explicit consent** (Art. 9(2)(a) GDPR) – when you switch the feature on in the
app. We also handle reports and moderation on the basis of Art. 6(1)(f) GDPR (legitimate interest in a safe community
without abuse). We review reports ourselves; no automated system decides.

**Recipients:** Supabase as a processor (section 11) and – for the visible information above – the other users of
the app.

**Storage period and deletion:** the data remains stored until you delete your social account. “Delete social
account” in the app deletes the account, profile, result posts, following and followers, reactions, community
memberships, reports and blocks **immediately**. Delete your social account before you delete the app or choose
“Reset”: without the key on your device, nobody can access it any more, not even you. In that case, write to us at
[E-Mail-Adresse].

**Withdrawal:** you can withdraw your consent at any time with effect for the future – with “Delete social account”
in the app. Processing carried out lawfully until then remains unaffected.

## 9. Feedback to Kolbi (optional)

If you send feedback in the app, we store only the following with Supabase (Frankfurt): your choice (😍/🙂/😕), your
text (max. 1000 characters), where in the app you wrote it, the app version including the platform (e.g. iOS,
Android or web) and the time – **without a device ID or any other identifier**. Please don’t include any names or
personal health data. We use the feedback only to improve the app and delete it after 12 months at the latest. Legal
basis: Art. 6(1)(a) GDPR (consent by sending). Because we cannot identify you, we cannot link individual entries to
you afterwards.

## 10. In-app purchases (store apps only)

Purchases of “Lab Pro” (subscription or one-time purchase) are handled entirely by Apple or Google; their privacy
policies apply. We do not receive any payment data, name or email address.

To show prices and check whether “Lab Pro” is active, the store apps use **RevenueCat** (RevenueCat, Inc., USA). This
runs **at every app start without a separate switch** as soon as purchases are enabled in the app – even if you
don’t buy anything. Processed are: a random, anonymous app user ID (stored on the device), technical details such as
platform and app version, the IP address of the connection and – if you buy or restore purchases – the purchase
receipts from Apple or Google (product, time, status). No health data.
Legal basis: Art. 6(1)(b) GDPR insofar as you buy or restore purchases (performance of a contract); otherwise
Art. 6(1)(f) GDPR (legitimate interest in showing prices correctly and unlocking purchased features). RevenueCat
processes the data on our behalf; for the transfer to the USA we rely on the EU-US Data Privacy Framework.

There are currently no purchases in the web app. If they are offered there, we will update this policy beforehand.

The store apps may show Apple’s or Google’s rating dialog. A rating goes directly to the store; we only see what is
publicly shown there.

## 11. Supabase (server for sections 5–9 including 8a)

Stats, web push, calendar subscription, community, social features and feedback run on **Supabase** (Supabase, Inc., USA) as a
processor. The database is located in a data centre in **Frankfurt am Main (EU)**. As with any internet request, the
server technically receives your IP address; our functions do not store it in the data described. All connections
are encrypted via HTTPS.

## 12. Beta test via Google Play and TestFlight

Before launch, we test the store apps in a closed test via **Google Play** or **TestFlight** (Apple). If you take
part, Google or Apple process your data as a tester – e.g. your Google account or membership in the tester group, the
email address of a TestFlight invitation, and installation and crash data – **under their own terms and privacy policies**. In their developer consoles we only see what the platform shows us (e.g. number of testers, crash
reports, feedback sent via the store channel, and for TestFlight possibly the name and email address of invited
testers). You can send feedback on the test version via the Google Play or TestFlight feedback channel or by email;
we use it only to improve the app and delete it as soon as it is no longer needed for that. Inside the app, the same
applies to testers as to everyone else (sections 2–11). Legal basis: Art. 6(1)(f) GDPR (legitimate interest in
checking and improving the app before launch).

## 13. Shopping links and sharing

For some supplements, we show a link to a search on Amazon. Only when you tap it do you leave the app; from then on,
Amazon’s privacy policy applies. If these links are marked as “Ad”, we may receive a commission if you make a
purchase – the price does not change for you.

If you share a result card or an invitation, the app uses your device’s share menu; you decide where the content goes.

## 14. Storage period

- Local data on your device: until you delete it (delete the app or “Reset”). A copy in an iPhone device backup
  (section 2) remains until you delete that backup or it is replaced.
- Stats: only daily counters without personal reference; they are not linked to individual people.
- Web push: sent entries at most 2 days, push address until you switch it off or it becomes invalid.
- Calendar subscription: until “End subscription” or until you send us the subscription link for deletion.
- Community: until you delete your contributions.
- Social features: until you delete your social account (then immediately).
- Feedback: at most 12 months.
- RevenueCat: as long as needed to verify your purchases.
- Hosting logs at Vercel: according to Vercel’s retention periods.

## 15. Your rights

You have the right of access, rectification, erasure, restriction of processing and data portability, as well as the
right to withdraw consent at any time with effect for the future.

**Right to object:** insofar as we process data on the basis of Art. 6(1)(f) GDPR (sections 4, 5, 8a, 10, 12), you can
object at any time on grounds relating to your particular situation (Art. 21 GDPR). For the stats, simply turn them
off in the settings.

Because we cannot link the server data to any person, please use the delete and switch-off functions in the app or
write to us at [E-Mail-Adresse]. You can also lodge a complaint with a data protection supervisory authority, e.g.
the authority of your federal state or country.

You are not obliged to provide us with any data; the core features of the app work without the optional features.
There is no automated decision-making or profiling.

## 16. No selling, no tracking

We don’t sell any data, and we don’t use advertising trackers or cookies for advertising purposes. Service providers
(Vercel, Supabase, RevenueCat) process data only on our behalf.
