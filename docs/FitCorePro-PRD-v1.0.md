__FITCORE PRO__

Fitness & Nutrition CRM Platform

Product Requirements Document \(PRD\)

Versiune: 1\.0

Data: Aprilie 2026

Autor: Narcis

Clasificare: Confidential

Tech Stack: Next\.js • Supabase • Clerk • Stripe

# Cuprins

# 1\. Executive Summary

FitCore Pro este o platformă CRM specializată pentru antrenori de fitness și nutriționiști, proiectată să transforme modul în care acești profesioniști își gestionează clienții, serviciile și prezența digitală\. Platforma operează pe un model B2B2C: antrenorii sunt utilizatorii care plătesc un abonament lunar, iar clienții lor accesează platforma gratuit, beneficiind de un ecosistem digital complet pentru tracking\-ul progresului, comunicare și acces la planuri personalizate\.

Platforma NU gestionează plățile directe dintre clienți și antrenori\. Monetizarea se bazează exclusiv pe abonamentele antrenorilor, cu tier\-uri care oferă funcționalități progresive\.

## 1\.1\. Propunere de Valoare

### Pentru Antrenori

- CRM complet dedicat industriei fitness — nu un CRM generic adaptat
- Pagină publică de prezentare \(micro\-site\) customizabilă cu propriul brand
- Resurse de marketing pre\-construite \(template\-uri social media, email\-uri, landing pages\)
- Flux digital complet: de la lead capture până la livrarea serviciilor
- Automatizări pentru onboarding, follow\-up și re\-engagement clienți
- Dashboard analitic cu metrici de business și progres clienți

### Pentru Clienți

- Portal personal cu planuri de antrenament și nutriție
- Înregistrare progres: poze before/after, măsurători, greutate, compoziție corporală
- Comunicare directă cu antrenorul prin mesagerie integrată
- Vizualizare cronologică a evoluției personale
- Acces la biblioteca de exerciții și rețete a antrenorului

# 2\. Context Strategic și Analiza Pieței

## 2\.1\. Problema de Piață

Antrenorii de fitness și nutriționiștii se confruntă cu un peisaj fragmentat de instrumente digitale\. Majoritatea folosesc o combinație ad\-hoc de: WhatsApp/Telegram pentru comunicare, Google Sheets/Excel pentru tracking, Canva pentru marketing, platforme separate de scheduling, și nicio soluție integrată pentru gestionarea progresului clienților\. Această fragmentare duce la pierdere de timp, inconsistență în servicii și imposibilitatea de a scala business\-ul\.

## 2\.2\. Peisaj Competitiv

__Platformă__

__Focus__

__Puncte Forte__

__Gap\-uri__

Trainerize

Training Programs

Exerciții video, programe

Slab pe CRM și marketing

My PT Hub

PT Management

Client tracking

Fără marketing tools

TrueCoach

Programming

Workout builder avansat

Fără nutriție, fără CRM

Everfit

All\-in\-one

Automatizări

Complex, scump

FitCore Pro

CRM \+ Marketing \+ Delivery

CRM nativ, marketing kit, micro\-site, flux digital complet

Nou pe piață

## 2\.3\. Target Market

Segmentul primar: antrenori personali independenți, nutriționiști, preparatori fizici, antrenori online\. Segmentul secundar: săli de fitness mici\-medii, studiouri boutique, clinici de nutriție\. Geografie inițială: România \(cu potențial de expansiune globală datorită UI multilingv\)\.

## 2\.4\. Business Model

__Plan__

__Preț/lună__

__Clienți Activi__

__Funcționalități Cheie__

Starter

29 EUR

Până la 15

CRM de bază, micro\-site simplu, mesagerie, 1 program template

Growth

59 EUR

Până la 50

Marketing kit, automatizări, nutriție, analytics, custom branding

Pro

99 EUR

Până la 150

White\-label, API, sub\-antrenori, AI insights, priority support

Enterprise

Custom

Nelimitat

Multi\-locație, SSO, SLA dedicat, account manager

# 3\. User Personas

## 3\.1\. Persona: Antrenorul Solo

__Nume: __Alex, 28 ani, antrenor personal certificat

__Context: __Lucrează independent, are 20\-30 de clienți, folosește WhatsApp și Google Sheets

__Dureri: __Pierde 2h/zi pe admin, nu poate scala, nu are prezență online profesională

__Obiective: __Să ajungă la 50 de clienți fără să crească munca administrativă

__Plan potrivit: __Growth \(59 EUR/lună\)

## 3\.2\. Persona: Nutriționistul Clinician

__Nume: __Maria, 35 ani, nutriționistă cu cabinet propriu

__Context: __Consultă 15\-20 pacienți/săptămână, creează planuri alimentare manual

__Dureri: __Fiecare plan alimentar durează 45min, nu poate monitoriza complianța pacienților

__Obiective: __Template\-uri de planuri alimentare, tracking nutrițional al pacienților

__Plan potrivit: __Growth \(59 EUR/lună\)

## 3\.3\. Persona: Studio Owner

__Nume: __Radu, 40 ani, proprietar studio functional fitness

__Context: __3 antrenori angajați, 80\+ clienți, folosesc 5 unelte diferite

__Dureri: __Lipsa vizibilității asupra activității antrenorilor, branding inconsistent

__Obiective: __Platformă unificată cu management multi\-antrenor

__Plan potrivit: __Pro \(99 EUR/lună\)

## 3\.4\. Persona: Clientul

__Nume: __Ioana, 32 ani, profesionistă care vrea să slăbească

__Context: __Are un antrenor personal, primește programul pe PDF, raportează pe WhatsApp

__Dureri: __Nu vede progresul vizual, pierde PDF\-urile, nici o structură

__Obiective: __Să\-și vadă evoluția clar, să aibă totul în un singur loc

# 4\. Arhitectură Tehnică

## 4\.1\. Tech Stack

__Layer__

__Tehnologie__

__Justificare__

Frontend

Next\.js 15 \(App Router\)

SSR/SSG pentru SEO pe micro\-site\-uri, RSC, edge runtime

Styling

Tailwind CSS \+ shadcn/ui

Design system consistent, rapid development

Autentificare

Clerk

Multi\-tenant auth, social login, organizații, roluri

Bază de date

Supabase \(PostgreSQL\)

RLS, realtime subscriptions, storage integrat

Stocare fișiere

Supabase Storage

Poze progres, documente, media

Plăți

Stripe

Subscriptions, Customer Portal, Webhooks

Email tranzacțional

Resend

Template\-uri React Email, deliverability

Mesagerie real\-time

Supabase Realtime

WebSocket nativ, presence, broadcast

Job\-uri asincrone

Trigger\.dev / Inngest

Automatizări, remindere, rapoarte

Analytics

PostHog

Product analytics, feature flags, session replay

CDN / Edge

Vercel

Edge functions, ISR, image optimization

AI \(viitor\)

Anthropic Claude API

Generare planuri, analiză progres, recomandări

## 4\.2\. Arhitectură Multi\-Tenant

Platforma utilizează un model multi\-tenant cu izolare la nivel de rând \(Row Level Security\)\. Fiecare antrenor este un “tenant” cu propriul spațiu de date\. Clienții sunt legați de tenant\-ul antrenorului lor\. Un client poate fi asociat cu mai mulți antrenori \(ex: antrenor fitness \+ nutriționist\)\.

Clerk Organizations vor fi folosite pentru a gestiona ierarhia: Owner \(antrenorul principal\) → Admin \(co\-antrenori\) → Member \(clienți\)\. Fiecare organizație are propriul subdomain sau slug pentru micro\-site\-ul public\.

## 4\.3\. Schema Bazei de Date \(Core Entities\)

__Tabel__

__Descriere__

__Relații Cheie__

trainers

Profil antrenor, plan, config branding

1:N cu clients, programs, services

clients

Profil client, date sănătate, obiective

N:1 cu trainers, 1:N cu progress\_entries

trainer\_clients

Tabel juncțiune trainer\-client

FK trainer\_id, client\_id, status, start\_date

programs

Programe de antrenament/nutriție

FK trainer\_id, 1:N cu program\_phases

program\_phases

Faze/săptămâni din program

FK program\_id, 1:N cu workouts/meal\_plans

workouts

Antrenamente individuale

FK phase\_id, 1:N cu workout\_exercises

workout\_exercises

Exerciții în antrenament

FK workout\_id, FK exercise\_id

exercises

Biblioteca de exerciții \(global \+ custom\)

owner\_type: system/trainer

meal\_plans

Planuri alimentare

FK phase\_id, 1:N cu meals

meals

Mese individuale cu macro\-nutrienți

FK meal\_plan\_id, 1:N cu meal\_items

meal\_items

Alimente în masă

FK meal\_id, FK food\_id

foods

Bază de alimente \(global \+ custom\)

owner\_type: system/trainer

progress\_entries

Intrări progres \(greutate, măsurători\)

FK client\_id

progress\_photos

Poze progres cu metadata

FK progress\_entry\_id

messages

Mesaje trainer\-client

FK conversation\_id

conversations

Thread\-uri de conversație

FK trainer\_id, FK client\_id

appointments

Programări/sesiuni

FK trainer\_id, FK client\_id

services

Servicii oferite de antrenor

FK trainer\_id

leads

Lead\-uri din micro\-site

FK trainer\_id, status pipeline

automations

Reguli de automatizare

FK trainer\_id

marketing\_assets

Asset\-uri marketing generate

FK trainer\_id

invoices

Facturi \(referință, fără procesare plăți\)

FK trainer\_id, FK client\_id

notifications

Notificări in\-app și push

FK user\_id

trainer\_settings

Setări platformă per antrenor

FK trainer\_id

client\_documents

Documente încărcate de clienți

FK client\_id

forms

Formulare custom \(chestionare, intake\)

FK trainer\_id

form\_responses

Răspunsuri la formulare

FK form\_id, FK client\_id

tags

Tag\-uri pentru segmentare clienți

FK trainer\_id

client\_tags

Tabel juncțiune client\-tag

FK client\_id, FK tag\_id

# 5\. Funcționalități Antrenor \(Detaliate\)

## 5\.1\. Dashboard Antrenor

Dashboard\-ul este pagina principală după login, oferind o viziune de ansamblu asupra business\-ului și a activității clienților\.

### Carduri KPI

- Clienți activi \(vs\. luna trecută, trend\)
- Lead\-uri noi \(săptămâna aceasta\)
- Sesiuni programate \(azi, săptămâna\)
- Rata de complianță medie clienți
- Venituri estimate \(din servicii listate, calculat, nu procesat\)
- Mesaje necitite

### Feed Activitate

Timeline cronologic cu acțiuni recente: noi check\-in\-uri de la clienți, poze progres încărcate, mesaje primite, lead\-uri noi, programări confirmate, milestone\-uri atinse de clienți\.

## 5\.2\. CRM & Gestionare Clienți

### 5\.2\.1\. Pipeline Lead\-uri

Vizualizare Kanban cu stagii customizabile: Lead Nou → Contactat → Consultație Programată → Propunere Trimisă → Client Activ → Inactiv/Pierdut\. Drag & drop între stagii\. Fiecare lead captează: sursa \(micro\-site, referral, manual\), date de contact, note, istoric comunicări, scor de calificare\.

### 5\.2\.2\. Profil Client \(Viziune Antrenor\)

- Header: poza profil, nume, vârstă, tag\-uri, status \(activ/inactiv/pauzat\)
- Tab Sănătate: condiții medicale, alergii, restricții alimentare, medicație
- Tab Obiective: obiective definite, target date, progres procentual
- Tab Progres: grafice evoluție greutate, măsurători, compoziție corporală
- Tab Poze: galerie before/after cu comparare side\-by\-side
- Tab Programe: programul activ \+ istoric
- Tab Nutriție: plan alimentar activ, log\-uri alimentare
- Tab Mesaje: conversație dedicată
- Tab Documente: formulare completate, documente încărcate
- Tab Note: note interne ale antrenorului \(invizibile clientului\)
- Tab Facturare: referințe facturi, servicii contractate

### 5\.2\.3\. Segmentare & Tag\-uri

Sistem de tag\-uri nelimitate cu culori custom: obiective \(slăbire, masa musculară, reabilitare\), nivel \(începător, intermediar, avansat\), tip serviciu \(online, în persoană, hibrid\), status plăți \(la zi, restant\), preferinte \(matinal, seara\)\. Filtrare avansată după combinații de tag\-uri\.

### 5\.2\.4\. Acțiuni Bulk

Selecție multiplă de clienți pentru: trimitere mesaj de grup, atribuire program, adaugare/eliminare tag\-uri, export CSV, trimitere formular\.

## 5\.3\. Program Builder \(Antrenamente\)

### 5\.3\.1\. Structură Program

Ierarhie: Program → Faze \(ex: Săptămânile 1\-4\) → Zile → Antrenamente → Exerciții\. Fiecare exercițiu capționează: seturi, repetări, pauză, tempo, RPE/RIR, note, video demonstrativ \(link YouTube/Vimeo sau upload\)\.

### 5\.3\.2\. Funcționalități Avansate

- Superseturi și circuite \(grupare exerciții\)
- Progresia automată \(încărcare progresivă săptămânală\)
- Template\-uri salvabile și re\-utilizabile
- Duplicare și adaptare programe
- Biblioteca de exerciții: exerciții sistem \(500\+ pre\-populate\) \+ exerciții custom ale antrenorului
- Exerciții cu video demonstrativ, muscle groups, echipament necesar
- Drag & drop reordering exerciții în workout

## 5\.4\. Nutrition Builder

- Calculator TDEE integrat \(Harris\-Benedict, Mifflin\-St Jeor, Katch\-McArdle\)
- Planuri alimentare pe zile cu variante \(zi de antrenament vs\. zi de odihnă\)
- Bază de alimente cu valori nutriționale \(USDA \+ custom\)
- Calculare automată macronutrienți per masă și per zi
- Rețete custom cu instrucțiuni de preparare
- Listă de cumpărături generată automat din planul alimentar
- Template\-uri de planuri alimentare reutilizabile
- Suport alergii/intoleranțe/preferințe \(vegan, keto, fasting\)

## 5\.5\. Micro\-Site Public \(Pagina Antrenorului\)

Fiecare antrenor primește un micro\-site public accesibil la trainer\-slug\.fitcorepro\.com sau pe domeniu propriu \(custom domain support\)\. Micro\-site\-ul servește ca pagină de prezentare profesională și canal de achiziție clienți\.

### Secțiuni Micro\-Site

- Hero section cu foto, tagline, CTA principal
- Despre mine \(bio, certificări, specializare, ani experiență\)
- Servicii oferite cu descriere și prețuri orientative
- Galerie transformări clienți \(before/after cu consimțământ\)
- Testimoniale clienți
- Blog/Articole \(SEO\)
- FAQ
- Formular de contact / programare consultație gratuită
- Footer cu social links și informații de contact

### Customizare

Paleta de culori \(primară, secundară, accent\), font pairing, layout\-uri pre\-definite \(5\+ teme\), upload logo, cover photo, favicon\. Planul Pro permite custom CSS și eliminarea badge\-ului “Powered by FitCore Pro”\.

## 5\.6\. Marketing Kit

### 5\.6\.1\. Template\-uri Social Media

Biblioteca de template\-uri Canva\-like editabile: posturi Instagram \(feed, stories, reels cover\), posturi Facebook, YouTube thumbnails\. Categorii: motivațional, educațional, promovare servicii, testimoniale, sfaturi nutriție\. Antrenorul își adaugă logo, culori, foto, text și exportează imaginea\.

### 5\.6\.2\. Email Marketing

Template\-uri email pre\-construite: welcome sequence \(3\-5 emailuri\), newsletter lunar, ofertă specială, re\-engagement clienți inactivi, reminder sesiune, felicitări aniversare\. Editor drag & drop cu merge tags \(\{client\_name\}, \{trainer\_name\}, etc\.\)\. Trimitere manuală sau programată către segmente de clienți\.

### 5\.6\.3\. Lead Magnet Builder

Generator de lead magnets: e\-book template \(ghid nutriție, plan 7 zile, checklist fitness\), formular de colectare email integrat în micro\-site, download automat după completare formular, lead automat adăugat în pipeline CRM\.

### 5\.6\.4\. Referal System

Clienții existenți pot referi noi clienți printr\-un link unic\. Antrenorul definește recompensa \(discount, sesiune gratuită\)\. Tracking automat al referral\-urilor\. Dashboard cu top referrers\.

## 5\.7\. Scheduling & Calendar

- Calendar vizual \(zi/săptămână/lună\) cu sesiunile programate
- Disponibilități configurabile \(ore, zile, durată sesiune, buffer între sesiuni\)
- Booking până public pe micro\-site \(embed widget\)
- Sincronizare Google Calendar / Apple Calendar \(iCal\)
- Reminder automat \(email \+ notificare\) la 24h și 1h înainte
- Sesiuni recurente \(săptămânale\)
- Tipuri de sesiuni: 1\-on\-1, grup, online \(cu link Zoom/Meet\), in\-person
- Cancelări cu politică configurabilă \(24h înainte, fără penalitate\)

## 5\.8\. Formulare & Chestionare

Form builder cu drag & drop pentru creare formulare custom\. Tipuri de câmpuri: text scurt/lung, selecție unică/multiplă, slider numeric, dată, upload fișier, semnătură electronică\.

### Formulare Pre\-construite

- Intake Form \(nou client\): istoric medical, nivel fitness, obiective, disponibilitate
- PAR\-Q \(Physical Activity Readiness Questionnaire\)
- Chestionar nutrițional \(preferințe, alergii, obiceiuri alimentare\)
- Weekly Check\-in \(cum te\-ai simțit, complianță plan, feedback\)
- Consimțământ GDPR și procesare date
- NPS / Satisfaction survey

## 5\.9\. Automatizări \(Workflow Engine\)

Motor de automatizări bazat pe triggere și acțiuni, similar cu Zapier dar specific domeniului fitness\.

### Trigger\-e Disponibile

- Client nou adăugat
- Lead nou din micro\-site
- Check\-in completat
- Poză progres încărcată
- Obiectiv atins \(milestone\)
- Client inactiv X zile
- Aniversare colaborare
- Program ajuns la final

### Acțiuni Disponibile

- Trimite email \(template selectabil\)
- Trimite notificare in\-app
- Atribuie formular
- Mută lead în alt stagiu
- Adaugă/elimină tag
- Creează task intern \(reminder antrenor\)
- Așteaptă X zile \(delay\)

## 5\.10\. Analytics & Rapoarte

### Metrici Business

- Client Lifetime Value \(estimat\)
- Churn rate \(rata de abandon\)
- Conversion rate lead → client
- Revenue per client
- Sursa lead\-urilor \(micro\-site, referral, manual\)

### Metrici Performanță Clienți \(Agregat\)

- Complianță medie \(antrenament și nutriție\)
- Progres mediu greutate/măsurători
- Frecvență check\-in
- Clienți cu progres bun vs\. stagnați
- Rapoarte export PDF \(pentru prezentări către clienți\)

## 5\.11\. Mesagerie & Comunicare

- Chat real\-time trainer\-client \(Supabase Realtime\)
- Suport media: imagini, documente, link\-uri, voice notes
- Broadcast messages \(către toți clienții sau un segment\)
- Template\-uri răspuns rapid
- Indicator read/delivered
- Notificări push \(browser \+ email fallback\)
- Ore de liniște configurabile \(nu se trimit notificări noaptea\)

## 5\.12\. Facturare și Evidență Financiară

IMPORTANT: Platforma NU procesează plățile clienți → antrenor\. Modulul de facturare este exclusiv pentru evidență și tracking\.

- Generare factură proformă \(PDF\) cu datele antrenorului
- Tracking manual statusul plății \(plătit/neplătit/parțial\)
- Servicii cu preț predefinit \(pachet 10 sesiuni, abonament lunar\)
- Reminder plăți restante \(email automat\)
- Raport venituri lunare/trimestriale

# 6\. Funcționalități Client \(Detaliate\)

## 6\.1\. Portal Client \(Dashboard\)

Clientul accesează portalul prin link de invitație primit de la antrenor sau prin autentificare pe micro\-site\-ul antrenorului\. Portalul este branded cu culorile și logo\-ul antrenorului\.

### Elemente Dashboard Client

- Antrenamentul zilei / de azi \(vizualizare rapidă\)
- Planul alimentar de azi
- Următoarea sesiune programată
- Progres spre obiectiv \(progress bar\)
- Streak \(zile consecutive cu check\-in\)
- Mesaje noi de la antrenor
- Quick actions: log workout, log meal, add progress photo, message trainer

## 6\.2\. Antrenamente \(Viziune Client\)

- Vizualizare program complet pe săptămâni/zile
- Workout tracker: log seturi/repetări/greutăți efectiv realizate
- Timer integrat \(pauze între seturi, AMRAP, EMOM\)
- Video demonstrativ exercițiu \(inline playback\)
- Istoric antrenamente anterioare cu volume/intensitate
- Personal records \(PR\) tracking și felicitări
- Note/feedback per antrenament \(visible antrenorului\)
- Rating antrenament \(difficulty perceived, RPE\)

## 6\.3\. Nutriție \(Viziune Client\)

- Planul alimentar al zilei cu cantități și macros
- Food log: înregistrare alimente consumate \(căutare în bază \+ barcode scan\)
- Complianță plan: procentaj atingere target macros
- Vizualizare macros consumate vs\. target \(donut chart\)
- Water intake tracker
- Foto meal \(încărcare poză masă pentru review antrenor\)
- Listă de cumpărături interactivă \(checkable\)
- Rețete cu instrucțiuni pas cu pas

## 6\.4\. Tracking Progres

### 6\.4\.1\. Măsurători Corporale

Intrări periodice \(săptămânale recomandat\): greutate, procent grăsime corporală, circumferință talie/șold/braț/piept/coapsă, BMI calculat\. Grafice de evoluție cu trendline\. Export date\.

### 6\.4\.2\. Galerie Progres Foto

- Upload poze \(față, profil, spate\) cu ghidaj de pozare
- Timeline cronologică cu vizualizare grid
- Comparator before/after cu slider
- Setare vizibilitate: privat \(doar antrenorul\) sau public \(galerie transformări\)
- Metadata: dată, greutate la momentul pozei, note
- Stocare securizată cu control acces \(doar clientul și antrenorul desemnat\)

### 6\.4\.3\. Wellness Log

- Somn \(ore, calitate 1\-5\)
- Energie \(scală 1\-10\)
- Stres \(scală 1\-10\)
- Dispoziție \(emoji selector\)
- Notă zilnică \(text liber\)
- Corelație vizuală wellness vs\. performanță antrenament

### 6\.4\.4\. Documente & Artefacte

Clientul poate încărca: analize medicale \(PDF/imagine\), rețete medicale, certificări sportive, rapoarte DEXA/InBody, orice document relevant\. Organizare pe categorii, vizibil antrenorului și clientului\.

## 6\.5\. Gamificare & Motivație

- Badges/Achievement\-uri: prima poză progres, 7 zile streak, PR, obiectiv atins
- Streak counter \(check\-in\-uri consecutive\)
- Milestone celebrations \(notificări animate la atingere obiective\)
- Leaderboard opțional \(între clienții aceluiași antrenor, opt\-in\)
- Challenge\-uri de grup \(setate de antrenor\): 30 zile fără zahăr, 10\.000 pași/zi

## 6\.6\. Onboarding Client

Fluxul de onboarding este configurat de antrenor și poate include o secvență de pași automatizați\.

1. Invitație email cu link de creare cont
2. Completare profil: date personale, măsurători inițiale
3. Completare Intake Form \+ PAR\-Q
4. Upload poze inițiale \(before\)
5. Accept GDPR și Terms of Service
6. Primire program \+ plan alimentar
7. Tutorial ghidat al platformei

# 7\. Funcționalități Comune / Platformă

## 7\.1\. Autentificare & Securitate

- Clerk: email/password, Google, Apple Sign\-In
- 2FA opțional \(TOTP, SMS\)
- Role\-Based Access Control: owner, admin \(co\-antrenor\), client
- Supabase RLS pe fiecare tabel \(izolare completă date\)
- Encriptare at rest \(Supabase\) și in transit \(TLS\)
- Audit log acțiuni critice

## 7\.2\. GDPR & Compliance

- Consimțământ explicit colectare date sănătate \(categorie specială GDPR\)
- Dreptul la ștergere: client poate solicita ștergerea tuturor datelor
- Dreptul la export: export date personale în format JSON/CSV
- Dreptul la portabilitate
- DPA \(Data Processing Agreement\) template între antrenor și platformă
- Cookie banner și politică de confidențialitate
- Data retention policies configurabile

## 7\.3\. Notificări

__Canal__

__Tipuri de Notificări__

__Control__

In\-App

Toate acțiunile relevante

Granular per tip

Email

Sesiuni, remindere, rapoarte, marketing

Opt\-in/opt\-out per categorie

Push \(Browser\)

Mesaje noi, sesiuni iminente

Toggle global

Push \(Mobile\)

Mesaje, remindere, milestones

Toggle global \+ per tip

## 7\.4\. Integrari

### Faza 1 \(MVP\)

- Google Calendar / Apple Calendar \(iCal sync\)
- Zoom / Google Meet \(link automat la sesiuni online\)
- Stripe \(subscriptions antrenori\)

### Faza 2

- Apple Health / Google Fit / Garmin / Fitbit \(import date activitate\)
- MyFitnessPal \(import food log\)
- Whoop / Oura Ring \(recovery/sleep data\)

### Faza 3

- Zapier / Make webhook \(automatizări externe\)
- Public API \(planul Pro\)
- WhatsApp Business API \(notificări\)

## 7\.5\. Mobile Experience

Faza 1: PWA \(Progressive Web App\) cu manifest, service workers, offline mode pentru vizualizarea programului\. Faza 2: Native apps \(React Native/Expo\) cu notificări push native, widget\-uri \(antrenamentul zilei\), Apple Watch/WearOS companion app\. Design\-ul trebuie să fie mobile\-first, majoritatea clienților vor accesa platforma de pe telefon\.

## 7\.6\. Internaționalizare \(i18n\)

Suport multilingv din Faza 1: Română, Engleză\. Faza 2: Spaniolă, Italiană, Franceză, Germană\. Baza de alimente cu valori nutriționale localizate\. Moneda afișată pe micro\-site configurabilă \(RON, EUR, USD, GBP\)\. Timezone\-aware scheduling\.

# 8\. Funcționalități AI \(Roadmap\)

Modulele AI vor fi adăugate progresiv, utilizând Anthropic Claude API, cu scopul de a amplifica capacitățile antrenorului, nu de a\-l înlocui\.

## 8\.1\. AI Workout Generator

Antrenorul introduce parametrii \(obiectiv, nivel client, echipament disponibil, zile/săptămână, durată sesiune\) și AI generează un program complet pe care antrenorul îl revizuiește și ajustează înainte de a\-l atribui clientului\.

## 8\.2\. AI Meal Plan Generator

Bazat pe TDEE calculat, macros target, preferințe alimentare și restricții, AI generează un plan alimentar personalizat cu rețete și listă de cumpărături\.

## 8\.3\. Smart Progress Analysis

Analiză automată a datelor de progres cu recomandări: „Clientul X a platonat de 3 săptămâni, recomandăm ajustare calorii”, „Clientul Y are complianță scăzută la nutriție — sugerăm check\-in suplimentar”\.

## 8\.4\. AI Content Generator

Generare conținut marketing: captions social media, articole blog, email\-uri, copy micro\-site\. Bazat pe tonul antrenorului și specializarea lui\.

## 8\.5\. Chatbot Client \(AI Assistant\)

Asistent AI care răspunde la întrebări frecvente ale clienților \(„Ce exercițiu pot substitui?”, „Câte calorii are o banană?”\) pe baza planurilor și directivelor setate de antrenor\. Escală către antrenor când întrebarea depășește capabilitățile\.

# 9\. Fluxuri Utilizator Cheie

## 9\.1\. Flux: Antrenor Nou → Primul Client

1. Antrenorul se înregistrează \(Clerk\) → alege plan Stripe → verifică email
2. Completează profilul: bio, certificări, specializare, foto
3. Configurează micro\-site\-ul: culori, secțiuni, servicii, disponibilități
4. Creează serviciile oferite \(ex: Antrenament 1\-on\-1, Plan Nutriție\)
5. Configurează formularul de intake
6. Invită primul client \(email / link / QR code\)
7. Clientul primește invitația → parcurge onboarding\-ul
8. Antrenorul revizuiește datele clientului → creează program și plan alimentar
9. Atribuie programul → clientul începe să logeze activitatea

## 9\.2\. Flux: Lead din Micro\-Site → Client Activ

1. Vizitatorul găsește micro\-site\-ul \(organic/social/referral\)
2. Completează formularul de contact sau solicită consultație gratuită
3. Lead apare automat în pipeline CRM \(stagiu: Lead Nou\)
4. Automatizare: email de confirmare \+ calendarizare consultație
5. Antrenorul mută lead\-ul prin stagii pe măsură ce avansează
6. La conversie: lead devine client → se trimite invitație onboarding

## 9\.3\. Flux: Check\-in Săptămânal Client

1. Automatizare trimite reminder check\-in \(duminică seara\)
2. Clientul deschide formularul de check\-in
3. Completează: greutate, măsurători, poze progres, feedback
4. Antrenorul primește notificare → revizuiește check\-in\-ul
5. Antrenorul adaugă feedback/ajustări → clientul e notificat

# 10\. Cerințe Non\-Funcționale

__Categorie__

__Cerință__

__Target__

Performanță

Time to First Byte \(TTFB\)

< 200ms \(edge\)

Performanță

Largest Contentful Paint \(LCP\)

< 2\.5s

Performanță

First Input Delay \(FID\)

< 100ms

Performanță

API Response Time \(P95\)

< 500ms

Scalabilitate

Concurrent Users

10\.000\+ simultan

Scalabilitate

Database

Supabase managed, connection pooling

Disponibilitate

Uptime SLA

99\.9%

Disponibilitate

RTO \(Recovery Time\)

< 1 oră

Disponibilitate

RPO \(Recovery Point\)

< 5 minute

Securitate

Date sănătate

Encriptare AES\-256 at rest

Securitate

Stocare poze

Pre\-signed URLs, 60min expiry

Securitate

OWASP Top 10

Conformitate completă

Accesibilitate

WCAG

2\.1 Level AA

Accesibilitate

Screen readers

Suport complet

Stocare

Poze per client

Până la 500MB \(plan Growth\)

Stocare

Documente per client

Până la 100MB

# 11\. Roadmap de Dezvoltare

## Faza 1: MVP \(Săptămânile 1\-12\)

__Sprint__

__Modul__

__Deliverables__

S1\-S2

Infrastructură

Next\.js setup, Supabase schema, Clerk auth, Stripe integration, CI/CD

S3\-S4

CRM Core

Trainer dashboard, client CRUD, tags, pipeline lead\-uri \(Kanban\)

S5\-S6

Program Builder

Workout builder, exercise library, program templates, client assignment

S7\-S8

Client Portal

Client dashboard, workout tracker, progress tracking \(greutate, măsurători\)

S9\-S10

Mesagerie & Scheduling

Real\-time chat, calendar, booking widget, reminders

S11\-S12

Micro\-Site & Launch

Micro\-site builder \(3 teme\), formulare, SEO, beta launch

## Faza 2: Growth \(Săptămânile 13\-24\)

__Sprint__

__Modul__

__Deliverables__

S13\-S14

Nutriție

Meal plan builder, food database, client food log, shopping list

S15\-S16

Marketing Kit

Social media templates, email marketing, lead magnets

S17\-S18

Automatizări

Workflow engine, templates automatizări, onboarding flows

S19\-S20

Analytics

Business metrics, client analytics, export rapoarte

S21\-S22

Progress Photos

Gallery, comparator, consent management

S23\-S24

Gamificare & Polish

Badges, streaks, challenges, PWA, mobile optimizations

## Faza 3: Scale \(Săptămânile 25\-36\)

__Sprint__

__Modul__

__Deliverables__

S25\-S28

AI Features

AI workout generator, AI meal planner, smart insights

S29\-S30

Integrări Wearable

Apple Health, Google Fit, Garmin, Whoop

S31\-S32

White\-Label

Custom domains, custom CSS, remove branding \(Pro\)

S33\-S34

Multi\-Trainer

Sub\-accounts, team management, shared clients

S35\-S36

API & Ecosystem

Public API, Zapier integration, WhatsApp notifications

# 12\. Metrici de Succes \(KPIs\)

## 12\.1\. Business KPIs

__Metrică__

__Target 6 luni__

__Target 12 luni__

__Target 24 luni__

MRR

5\.000 EUR

25\.000 EUR

100\.000 EUR

Antrenori activi

100

500

2\.000

Clienți activi \(total\)

1\.500

10\.000

50\.000

Churn rate antrenori

< 8%/lună

< 5%/lună

< 3%/lună

ARPU \(Average Revenue Per User\)

50 EUR

55 EUR

60 EUR

CAC \(Customer Acquisition Cost\)

< 100 EUR

< 80 EUR

< 60 EUR

LTV/CAC Ratio

> 3x

> 5x

> 8x

## 12\.2\. Product KPIs

__Metrică__

__Target__

DAU/MAU Ratio \(antrenori\)

> 60%

DAU/MAU Ratio \(clienți\)

> 40%

Timp mediu setup antrenor

< 30 minute

Client onboarding completion rate

> 85%

Check\-in completion rate \(clienți\)

> 70%/săptămână

NPS Score

> 50

Micro\-site conversion rate \(vizitator → lead\)

> 8%

Feature adoption \(nutrition module\)

> 60% dintre antrenori Growth\+

# 13\. Riscuri și Mitigații

__Risc__

__Impact__

__Probabilitate__

__Mitigare__

Compliance GDPR date sănătate

Înalt

Mediu

Audit extern GDPR, DPO consultant, consimțământ explicit granular

Scalabilitate Supabase

Mediu

Scăzut

Connection pooling, edge caching, CDN agresiv, plan pro Supabase

Adoptare lentă antrenori

Înalt

Înalt

Freemium trial 14 zile, onboarding concierge, content marketing

Concurență puternică

Mediu

Mediu

Focus pe CRM\+marketing \(niche\), rapidă execuție pe piața RO

Dependență de platforme terțe

Mediu

Scăzut

Abstraction layers, multiple providers, data portability

Securitate date foto

Înalt

Scăzut

Pre\-signed URLs, watermarking, audit access

# 14\. Strategie Go\-To\-Market

## 14\.1\. Faza Pre\-Launch

- Landing page cu waitlist \(colectare email\-uri antrenori interesați\)
- Parteneriate cu 5\-10 antrenori beta testers \(acces gratuit 3 luni\)
- Conținut educațional pe social media: „Cum să\-ți digitalizezi business\-ul de fitness”
- Prezență la evenimente fitness locale \(București, Cluj, Timișoara\)

## 14\.2\. Faza Launch

- Product Hunt launch
- Ofertă early adopter: 50% discount primele 6 luni
- Campanie Facebook/Instagram targetată antrenori certificatți
- Referral program: antrenor recomandă antrenor → 1 lună gratuit

## 14\.3\. Faza Growth

- SEO: blog cu articole despre business\-ul de fitness, nutriție, marketing
- YouTube tutorials și webinarii
- Certification program: „FitCore Pro Certified Trainer” badge
- Parteneriate cu organisme de certificare \(ACE, NASM, echivalente RO\)
- Marketplace template\-uri \(antrenori vând programe altor antrenori\)

# 15\. Structură Proiect Next\.js

fitcore\-pro/

├── app/ \(App Router\)

│   ├── \(marketing\)/ — Landing page, pricing, blog

│   ├── \(auth\)/ — Sign in, sign up, forgot password

│   ├── dashboard/ — Trainer dashboard \(protected\)

│   │   ├── clients/ — CRM, client profiles

│   │   ├── programs/ — Workout builder

│   │   ├── nutrition/ — Meal plan builder

│   │   ├── calendar/ — Scheduling

│   │   ├── messages/ — Chat

│   │   ├── marketing/ — Marketing kit

│   │   ├── analytics/ — Reports

│   │   ├── automations/ — Workflow builder

│   │   ├── site\-builder/ — Micro\-site editor

│   │   └── settings/ — Profile, billing, branding

│   ├── portal/ — Client portal \(protected\)

│   │   ├── workouts/ — Workout tracker

│   │   ├── nutrition/ — Meal plans, food log

│   │   ├── progress/ — Photos, measurements

│   │   ├── messages/ — Chat with trainer

│   │   └── documents/ — Forms, uploads

│   ├── \[trainer\-slug\]/ — Public micro\-site \(ISR/SSG\)

│   └── api/ — API routes

├── components/ — Shared UI components

├── lib/ — Utilities, Supabase client, Stripe helpers

├── hooks/ — Custom React hooks

├── types/ — TypeScript types

└── supabase/ — Migrations, seed data, RLS policies

# 16\. Appendix

## 16\.1\. Glosar

__Termen__

__Definiție__

CRM

Customer Relationship Management — sistem de gestionare relații cu clienții

TDEE

Total Daily Energy Expenditure — cheltuiala energetică zilnică totală

Macros

Macronutrienți: proteine, carbohidrați, grăsimi

RPE

Rate of Perceived Exertion — scală efort perceput \(1\-10\)

RIR

Reps In Reserve — repetări rămase în rezervă

PAR\-Q

Physical Activity Readiness Questionnaire

RLS

Row Level Security — securitate la nivel de rând în PostgreSQL

ISR

Incremental Static Regeneration — regenerare statică incrementală în Next\.js

PWA

Progressive Web App

DPA

Data Processing Agreement

ARPU

Average Revenue Per User

LTV

Lifetime Value — valoarea pe viață a unui client

CAC

Customer Acquisition Cost

NPS

Net Promoter Score

## 16\.2\. Document History

__Versiune__

__Data__

__Autor__

__Modificări__

1\.0

Aprilie 2026

Narcis

Document inițial complet

*— SFÂRȘIT DOCUMENT —*

