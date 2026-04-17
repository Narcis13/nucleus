__ESTATECORE PRO__

Real Estate Agent CRM & Growth Platform

Focus: Contracte de Reprezentare Exclusivă

Product Requirements Document \(PRD\)

Versiune: 1\.0

Data: Aprilie 2026

Autor: Narcis

Clasificare: Confidențial

Tech Stack: Next\.js • Supabase • Clerk • Stripe

# Cuprins

# 1\. Executive Summary

EstateCore Pro este o platformă CRM și growth all\-in\-one dedicată agenților imobiliari care lucrează cu contracte de reprezentare exclusivă\. Platforma oferă agenților un ecosistem digital complet: de la captarea lead\-urilor și gestionarea portofoliului de proprietăți, până la semnarea digitală a contractelor, managementul tranzacțiilor și marketingul automatizat — totul într\-un singur loc\.

Modelul de business este B2B2C: agenții imobiliari \(sau agențiile mici\) plătesc un abonament lunar\. Clienții lor \(vânzători/cumpărători/chiriași/proprietari\) accesează gratuit un portal dedicat unde pot vedea statusul tranzacțiilor, pot încărca documente, pot comunica cu agentul și pot accesa rapoarte de piață\.

IMPORTANT: Platforma NU procesează plățile clienților către agenți \(comisioane\)\. Monetizarea se bazează exclusiv pe abonamentele agenților\. Platforma servește ca instrument de productivitate, marketing și management al relațiilor, nu ca intermediar financiar\.

Diferențiatorul strategic: focus pe contracte de reprezentare exclusivă — platforma este proiectată să ajute agentul să demonstreze valoare clientului, să justifice exclusivitatea, și să livreze transparență totală pe parcursul mandatului\.

## 1\.1\. Propunere de Valoare

### Pentru Agentul Imobiliar

- CRM specializat imobiliar — nu un CRM generic adaptat, ci construit nativ pentru fluxul imobiliar
- Pipeline vizual tranzacții cu stagii specifice: Prospectare → Evaluare → Contract Exclusiv → Marketing → Vizionări → Ofertă → Negociere → Precontract → Notar → Închis
- Micro\-site profesional personalizat cu portofoliu proprietăți, testimoniale și generare lead\-uri
- Management contracte de reprezentare exclusivă: generare, semnare digitală, tracking termen, renewal alerts
- Marketing kit automatizat: broșuri proprietate, posturi social media, email campaigns, virtual tours
- Dashboard transparent pentru client care justifică exclusivitatea \(rapoarte activitate, vizionări, feedback\)
- Comparații de piață \(CMA\) automate și rapoarte de evaluare
- Calendar integrat cu vizionări, open houses, întâlniri notariale
- Automatizări: follow\-up lead\-uri, remindere contract expiră, rapoarte săptămânale către client

### Pentru Clientul Agentului \(Vânzător/Cumpărător\)

- Portal personal cu vizibilitate completă asupra activității agentului \(justificarea exclusivității\)
- Rapoarte de activitate: câte vizionări, ce feedback, ce acțiuni de marketing s\-au făcut
- Acces la documente: contracte, acte proprietate, extrase CF, certificări energetice
- Comunicare directă cu agentul prin mesagerie integrată
- Notificări real\-time: vizionare nouă, ofertă primită, document necesar
- Timeline tranzacție: vizualizare clară a stadiului în care se află procesul
- Shortlist proprietăți \(pentru cumpărători\) cu comparator integrat

# 2\. Context Strategic și Analiza Pieței

## 2\.1\. Problema de Piață

Agenții imobiliari, mai ales cei independenți sau din agenții mici, se confruntă cu o fragmentare severă a instrumentelor de lucru\. Majoritatea operează cu o combinație ad\-hoc de: Imobiliare\.ro/Storia/OLX pentru listare, WhatsApp/telefon pentru comunicare, Excel/Google Sheets pentru tracking, Canva pentru materiale marketing, Google Calendar pentru programare, dosare fizice sau Google Drive pentru documente\. Această fragmentare cauzează pierdere de lead\-uri, lipsă de transparență către client, imposibilitatea de a demonstra valoarea exclusivității și, în final, pierderea contractelor exclusive\.

Problema contractelor de reprezentare exclusivă este centrală: mulți clienți refuză exclusivitatea deoarece nu au vizibilitate asupra acțiunilor agentului\. Agentul nu poate demonstra concret ce a făcut, câți cumpărători a contactat, ce marketing a derulat\. EstateCore Pro rezolvă această problemă prin transparență radicală — clientul vede totul în timp real\.

## 2\.2\. Peisaj Competitiv

__Platformă__

__Focus__

__Puncte Forte__

__Gap\-uri__

Pipedrive / HubSpot

CRM Generic

Customizabil, ecosistem mare

Zero funcționalitate imobiliară nativă

Follow Up Boss

Real Estate CRM \(US\)

Lead routing, dialer

US\-centric, fără portofoliu, fără contracte

Propertybase

Real Estate CRM

Salesforce\-powered

Complex, scump, fără focus exclusivitate

REsimpli

Wholesaling RE

Deal analysis

Nișă îngustă \(wholesaling\)

AgentFire

RE Websites

IDX, landing pages

Doar website, fără CRM

Softimo / imoapp\.ro

RO Market

Potrivit pieța RO

Bătrân, UX slab, fără marketing

EstateCore Pro

Exclusive RE CRM

CRM \+ Contracte Exclusive \+ Marketing \+ Portal Client transparent

Nou pe piață

## 2\.3\. Target Market

Segment primar: agenți imobiliari independenți și echipe mici \(2\-10 agenți\) din România care lucrează sau vor să lucreze cu contracte de reprezentare exclusivă\. Segment secundar: agenții imobiliare medii \(10\-50 agenți\) care caută o platformă unificată\. Segment terțiar: administratori de portofolii de închiriere\. Geografie inițială: România \(București, Cluj, Timișoara, Iași, Brașov, Constanța\), cu expansiune UE\.

## 2\.4\. Business Model

__Plan__

__Preț/lună__

__Listinguri Active__

__Funcționalități Cheie__

Solo

39 EUR

Până la 20

CRM, micro\-site simplu, 1 pipeline, mesagerie, calendar, contracte digitale

Growth

79 EUR

Până la 75

Marketing kit, CMA automat, rapoarte client, automatizări, portal client complet

Team

149 EUR

Până la 300

Multi\-agent, lead routing, team analytics, branded portal, API integrări

Brokerage

Custom

Nelimitat

Multi\-oficiu, SSO, SLA dedicat, white\-label, account manager

## 2\.5\. De Ce Contracte de Reprezentare Exclusivă?

Contractul de reprezentare exclusivă este sfința elementul fundamental al unei practici imobiliare profesionale și profitabile\. Agenții care lucrează exclusiv beneficiază de: predictibilitate veniturilor \(comision garantat la vânzare\), posibilitatea de a investi real în marketing \(buget justificat pe proprietate\), control asupra procesului de vânzare \(preț, strategie, vizionări\), relație profesională cu clientul \(nu competiție cu alți 10 agenți pe aceeași proprietate\), și brand personal puternic \(„agent de încredere” vs\. „am și eu un apartament”\)\.

EstateCore Pro este construit de la zero pentru a facilita, justifica și menține exclusivitatea\. Fiecare funcționalitate răspunde la întrebarea: „Cum ajută asta agentul să demonstreze clientului că exclusivitatea merită?”

# 3\. User Personas

## 3\.1\. Agentul Solo — „Mihai, Agentul Independent”

__Profil: __Mihai, 34 ani, agent imobiliar de 5 ani, lucrează independent în București

__Portofoliu: __15\-25 proprietăți active, mix vânzare/închiriere

__Context: __Folosește Imobiliare\.ro \+ OLX \+ WhatsApp \+ Google Calendar \+ Excel\. Pierde 3h/zi pe admin

__Dureri: __Nu poate convinge clienții de valoarea exclusivității, pierde lead\-uri, materialele de marketing sunt neprofesionale

__Obiective: __Să lucreze doar cu contracte exclusive, să ajungă la 40 proprietăți, să aibă prezență online profesională

__Plan potrivit: __Growth \(79 EUR/lună\)

## 3\.2\. Echipa Mică — „Andreea, Team Leader”

__Profil: __Andreea, 40 ani, conduce o echipă de 4 agenți în Cluj\-Napoca

__Portofoliu: __60\-100 proprietăți active ca echipă

__Context: __Folosește CRM generic \+ instrumente separate\. Nu are vizibilitate pe performanța echipei

__Dureri: __Lead\-urile nu sunt distribuite eficient, brandingul echipei e inconsistent, raportare manuală

__Obiective: __Platformă unificată cu overview echipă, lead routing, brand consistent

__Plan potrivit: __Team \(149 EUR/lună\)

## 3\.3\. Clientul Vânzător — „Ionel, Proprietarul”

__Profil: __Ionel, 55 ani, vinde apartamentul moștenit, prima vânzare imobiliară

__Context: __Ezită să semneze exclusivitate \(„ce face agentul dacă nu am control?”\)

__Dureri: __Nu știe ce se întâmplă cu proprietatea, nu are vizibilitate, nu înțelege procesul

__Obiective: __Să vadă exact ce face agentul, să primească rapoarte, să vadă că banii de comision sunt justificați

## 3\.4\. Clientul Cumpărător — „Ana, Prima Casă”

__Profil: __Ana, 29 ani, își cumpără primul apartament, lucrează în IT

__Context: __Caută singură pe Imobiliare\.ro, e copleșită de opțiuni

__Dureri: __Nu știe pe cine să se bazeze, vrea să compare proprietăți structurat, nu înțelege actele

__Obiective: __Un agent de încredere care îi trimite proprietăți potrivite, un loc cu toate actele și etapele

# 4\. Arhitectură Tehnică

## 4\.1\. Tech Stack

__Layer__

__Tehnologie__

__Justificare__

Frontend

Next\.js 15 \(App Router\)

SSR/SSG micro\-site\-uri, ISR listinguri, SEO nativ

Styling

Tailwind CSS \+ shadcn/ui

Design system consistent, development rapid

Autentificare

Clerk

Multi\-tenant auth, organizații, roluri \(agent, admin, client\)

Bază de date

Supabase \(PostgreSQL \+ PostGIS\)

RLS, realtime, PostGIS pentru căutare geografică

Stocare fișiere

Supabase Storage \+ Cloudflare R2

Imagini HD proprietate, documente, contracte

Plăți

Stripe

Subscripții agenți, Customer Portal

Email

Resend

Email\-uri tranzacționale, campanii marketing

Mesagerie real\-time

Supabase Realtime

Chat agent\-client, notificări live

Job\-uri asincrone

Trigger\.dev / Inngest

Rapoarte automate, remindere, sync portaluri

Generare PDF

React PDF / Puppeteer

Broșuri proprietate, contracte, rapoarte CMA

Semnătură digitală

DocuSign API / Autogram\.sk

Semnare contracte exclusivitate, precontracte

Hărți

Mapbox / Google Maps

Harta proprietăți, POI\-uri, isochrone analysis

Analytics

PostHog

Product analytics, feature flags

CDN / Edge

Vercel

Edge functions, ISR, image optimization

AI \(viitor\)

Anthropic Claude API

Descrieri proprietate, analiză piață, matching inteligent

## 4\.2\. Arhitectură Multi\-Tenant

Multi\-tenancy cu RLS \(Row Level Security\) la nivel de rând\. Fiecare agent/agenție = un tenant\. Clienții au acces doar la datele propriilor tranzacții\. Clerk Organizations gestionează ierarhia: Broker Owner → Team Leader → Agent → Client\. Izolare completă a datelor între agenți, chiar și în cadrul aceleiași agenții \(cu excepția rapoartelor agregate pentru management\)\.

## 4\.3\. Schema Bazei de Date \(Core Entities\)

__Tabel__

__Descriere__

__Relații Cheie__

agents

Profil agent, licență, plan, config branding

1:N cu properties, clients, contracts

agent\_teams

Echipe cu structură ierarhică

1:N cu agents

clients

Persoane fizice/juridice \(vânzător/cumpărător/chiriaș\)

N:M cu agents, 1:N cu transactions

agent\_clients

Juncțiune agent\-client cu tip relație

FK agent\_id, client\_id, role, source

properties

Proprietăți \(listing complet\)

FK agent\_id, 1:N cu property\_photos, property\_features

property\_photos

Galerie foto proprietate \(ordonate\)

FK property\_id, ordine, caption

property\_features

Caracteristici proprietate \(structurat\)

FK property\_id

property\_rooms

Camere individuale cu dimensiuni

FK property\_id

property\_documents

Acte proprietate \(CF, certificat energetic\)

FK property\_id

exclusive\_contracts

Contracte de reprezentare exclusivă

FK agent\_id, FK client\_id, FK property\_id

contract\_activities

Log activități pe contract \(transparență\)

FK exclusive\_contract\_id

transactions

Tranzacții \(pipeline complet\)

FK agent\_id, FK property\_id, FK buyer\_id, FK seller\_id

transaction\_stages

Stagii tranzacție cu timestamps

FK transaction\_id

transaction\_documents

Documente tranzacție

FK transaction\_id

viewings

Vizionări programate/efectuate

FK property\_id, FK buyer\_client\_id

viewing\_feedback

Feedback post\-vizionare

FK viewing\_id

offers

Oferte pe proprietate

FK property\_id, FK buyer\_client\_id, status

leads

Lead\-uri \(surse multiple\)

FK agent\_id, status pipeline

lead\_activities

Istoric acțiuni pe lead

FK lead\_id

cma\_reports

Rapoarte Compar\. de Piață

FK property\_id, FK agent\_id

cma\_comparables

Proprietăți comparabile în CMA

FK cma\_report\_id

marketing\_campaigns

Campanii marketing per proprietate

FK property\_id

marketing\_assets

Asset\-uri generate \(broșuri, posturi\)

FK property\_id

open\_houses

Open house events

FK property\_id, date, RSVP

messages

Mesaje agent\-client

FK conversation\_id

conversations

Thread\-uri conversație

FK agent\_id, FK client\_id

appointments

Programări \(întâlniri, notar, vizionări\)

FK agent\_id, type

tasks

Task\-uri interne agent

FK agent\_id, FK transaction\_id

notifications

Notificări in\-app

FK user\_id

agent\_settings

Setări platformă per agent

FK agent\_id

forms

Formulare custom \(intake, feedback\)

FK agent\_id

form\_responses

Răspunsuri formulare

FK form\_id, FK client\_id

portal\_reports

Rapoarte generate pt portal client

FK exclusive\_contract\_id

tags

Tag\-uri segmentare

FK agent\_id

client\_tags

Juncțiune client\-tag

FK client\_id, FK tag\_id

property\_tags

Juncțiune proprietate\-tag

FK property\_id, FK tag\_id

commission\_records

Evidență comisioane \(tracking, nu procesare\)

FK transaction\_id

automations

Reguli automatizare workflow

FK agent\_id

buyer\_search\_profiles

Criterii căutare salvate cumpărător

FK client\_id

property\_matches

Match\-uri proprietate\-cumpărător

FK property\_id, FK search\_profile\_id

neighborhoods

Date despre cartiere/zone

geom PostGIS, statistici

# 5\. Funcționalități Agent \(Detaliate\)

## 5\.1\. Dashboard Agent

Dashboard\-ul principal oferă o perspectivă 360° asupra business\-ului imobiliar\.

### Carduri KPI

- Proprietăți active \(vânzare \+ închiriere\)
- Contracte exclusive active / expirare în curând \(< 30 zile\)
- Lead\-uri noi \(săptămâna curentă\)
- Vizionări programate \(azi / săptămâna\)
- Oferte active \(primite, în negociere\)
- Tranzacții în derulare \(în pipeline\)
- Comisioane estimate \(luna curentă / YTD\)
- Mesaje necitite
- Task\-uri scadente azi

### Feed Activitate

Timeline cronologic cu: lead\-uri noi, vizionări efectuate, oferte primite, documente încărcate de clienți, contracte semnate, schimbări de stagiu tranzacție, mesaje primite\.

## 5\.2\. CRM & Gestionare Clienți

### 5\.2\.1\. Pipeline Lead\-uri

Vizualizare Kanban cu stagii customizabile: Lead Nou → Contactat → Evaluat Nevoi → Proprietate Identificată → Vizionare Programată → În Negociere → Client Activ → Pierdut\. Surse lead: micro\-site, portaluri \(Imobiliare\.ro\), referral, open house, manual, reclame sociale\. Scor lead automat bazat pe: engagement, buget, urgență, completăre profil\.

### 5\.2\.2\. Profil Client \(Viziune Agent\)

- Header: nume, tip \(vânzător/cumpărător/proprietar/chiriaș\), status, tag\-uri, scor calificare
- Tab Date Personale: contact, CNP/CUI, adresă, persoană de încredere, note confidențiale
- Tab Cumpărător: buget, tipologie dorită, zone preferate, criterii must\-have/nice\-to\-have, sursa finanțării
- Tab Vânzător: proprietăți asociate, contracte exclusive, așteptări preț, urgență vânzare
- Tab Tranzacții: istoric complet \(finalizate \+ în curs\)
- Tab Vizionări: calendar vizionări, feedback\-uri
- Tab Documente: acte identitate, dovadă fonduri, contracte semnate
- Tab Mesaje: conversație dedicată
- Tab Istoric: timeline completă a tuturor interacțiunilor
- Tab Note: note interne agent \(invizibile clientului\)
- Tab Referal: cine a referit clientul, pe cine a referit clientul

### 5\.2\.3\. Segmentare & Tag\-uri

Sistem de tag\-uri nelimitate cu culori: tip client \(vânzător, cumpărător, investitor, dezvoltator, proprietar\), buget range, zonă interes, urgență \(urgent, 1\-3 luni, 6\+ luni\), sursa lead\-ului, calificare \(hot/warm/cold\), tip proprietate \(apartament, casă, teren, comercial\)\. Filtrare avansată, smart lists salvabile\.

## 5\.3\. Management Proprietăți

### 5\.3\.1\. Listing Proprietate \(Fișa Completă\)

Crearea unei proprietăți în sistem capționează toate datele necesare pentru marketing, portaluri și documentație legală\.

### Date Generale

- Tip: apartament, casă/vilă, teren, comercial, garsonieră, penthouse, duplex
- Tranzacție: vânzare, închiriere, vânzare\+închiriere
- Adresă completă cu geocodare automată \(lat/lng, PostGIS\)
- Preț cerut, preț minim acceptabil \(vizibil doar agent\), preț/mp calculat
- Suprafață utilă, suprafață construită, suprafață teren
- Număr camere, băi, balcoane, terase, locuri parcare
- Etaj / din etaje, an construcție, structură rezistență
- Compartimentare: decomandat, semidecomandat, circular, open\-space

### Detalii Tehnice

- Certificat energetic \(clasă A\-G\)
- Tip încălzire, izolație termică, tâmplărie
- Utilități \(gaz, curent, apă, canalizare, internet\)
- Stare: nou, renovat recent, necesită renovări, de lux
- Dotări: lift, aer condiționat, alarma, intercom, smart home
- Cheltuieli lunare estimate \(ntreținere, utilități\)

### Galerie Media

- Upload multiple imagini \(drag & drop, reordonare\)
- Optimizare automată imagini \(resize, watermark, compress\)
- Suport video tour \(upload sau link YouTube/Matterport\)
- Virtual tour 360° \(embed Matterport, Ricoh Tours\)
- Planșă 2D/3D \(upload sau generare\)
- Imagine principală selectabilă \(cover photo\)

### 5\.3\.2\. Managementul Camerelor

Fiecare cameră poate fi documentată individual: tip \(living, dormitor, bucătărie, baie, birou, dressing, cămară\), suprafață, orientare \(N/S/E/V\), finisaje, poze asociate\. Permite generarea automată de descrieri detaliate\.

### 5\.3\.3\. Status și Vizibilitate Proprietate

__Status__

__Descriere__

__Vizibilitate__

Draft

Listing în curs de completare

Doar agentul

Activ

Publicat, disponibil

Public pe micro\-site \+ portaluri

Rezervat

Ofertă acceptată, în tranzacție

Vizibil cu badge „REZERVAT”

Vândut

Tranzacție finalizată

Arhivat, vizibil în testimoniale

Închiriat

Contractul de închiriere semnat

Arhivat

Retras

Proprietarul a retras

Invizibil

Expirat

Contractul exclusiv a expirat

Invizibil, alert de renewal

## 5\.4\. Contracte de Reprezentare Exclusivă \(MODUL CENTRAL\)

Acesta este modulul care diferențiază EstateCore Pro de orice alt CRM imobiliar\. Este construit să răspundă la cea mai mare obiecție a clienților: „De ce să lucrez exclusiv cu un singur agent?”

### 5\.4\.1\. Generare Contract

- Template\-uri contract de reprezentare exclusivă conforme legislației românești
- Variante: exclusivitate vânzare, exclusivitate căutare \(buyer agent\), exclusivitate închiriere
- Câmpuri auto\-populate din profilul clientului și datele proprietății
- Clauză durată configurabilă \(30/60/90/120/180 zile\)
- Clauză comision \(procent \+ minim fix\)
- Clauză activități minime garantate \(număr vizionări, frecvență rapoarte\)
- Clauză marketing: buget minim alocat, canale de promovare
- Export PDF professional cu brandingul agentului

### 5\.4\.2\. Semnare Digitală

- Integrare cu soluții de semnătură electronică \(DocuSign, Autogram\)
- Fallback: upload contract semnat \(poză/scan\)
- Validitate juridică: semnătură electronică avansată conform eIDAS
- Notificări automate: trimis → vizualizat → semnat
- Stocare securizată a contractului semnat

### 5\.4\.3\. Tracking Activitate pe Contract \(TRANSPARENȚA\)

Acesta este mecanismul prin care agentul demonstrează clientului că lucrează activ\. Fiecare acțiune pe un contract exclusiv este loggată automat sau manual și vizibilă clientului în portalul său\.

### Acțiuni Auto\-Loggate

- Proprietate publicată pe portal X \(cu link\)
- Vizionare programată / efectuată / anulată
- Feedback primit de la potentiat cumpărător post\-vizionare
- Ofertă primită \(sumă, condiții\)
- Email marketing trimis \(open rate, click rate\)
- Post social media publicat \(cu preview\)
- Broșură digitală generată și distribuită
- Raport CMA generat

### Acțiuni Manual\-Loggate

- Apel telefonic cu potentiat cumpărător \(notă \+ durată\)
- Networking / pitching la alți agenți
- Vizită la proprietate \(inspecție, fotografiere, măsurători\)
- Consulțare cu evaluator / notar / avocat
- Cheltuială marketing \(sumă, descriere, dovadă\)

### 5\.4\.4\. Rapoarte Activitate pentru Client

Rapoarte automate generate săptămânal \(sau la frecvența setată în contract\) și trimise clientului prin email \+ disponibile în portal\. Raportul include: rezumat activități, număr vizionări, feedback\-uri primite, acțiuni de marketing derulate, interes de piață \(views listing online\), recomandări \(ajustare preț, îmbunătățiri proprietate\)\. Format: PDF branduit \+ versiune interactivă în portal\.

### 5\.4\.5\. Lifecycle Management Contract

- Dashboard contracte: active, expiră în 30 zile, expirate, finalizate cu succes
- Alert automat la 30/15/7 zile înainte de expirare
- Workflow renewal: generare contract nou, re\-negociere condiții, semnare
- Analiză performanță per contract: zile active, vizionări, oferte, cost marketing vs\. comision
- Clauză de ieșire: tracking condiții de reziliere, penalizări

## 5\.5\. Pipeline Tranzacții

Vizualizare Kanban a tuturor tranzacțiilor active\. Stagii predefinite \(customizabile\):

__Stagiu__

__Descriere__

__Acțiuni Cheie__

Evaluare

Analiză proprietate, CMA, pregătire listing

Vizită, poze, CMA, stabilire preț

Contract Exclusiv

Negociere și semnare contract exclusivitate

Generare contract, semnare, setup marketing

Marketing Activ

Proprietate publicată, promovare activă

Listare portaluri, social media, broșure

Vizionări

Programări și derulare vizionări

Scheduling, feedback, follow\-up

Ofertă / Negociere

Ofertă primită, negociere preț

Prezentare ofertă, contra\-ofertă, acceptare

Precontract

Antecontract/arvună în curs

Redactare precontract, verificări juridice

În Curs Notar

Programare notar, pregătire acte

Checklist acte, programare notar

Finalizat

Tranzacție încheiată

Predare chei, facturare comision, testimonial

Pierdut

Tranzacție eșuată

Notă motiv, lesson learned, re\-engagement

### 5\.5\.1\. Fișa Tranzacție

- Proprietatea asociată \(link la listing complet\)
- Părțile implicate: vânzător, cumpărător, agenți ambele părți
- Preț cerut, preț oferit, preț final, comision calculat
- Timeline stagii cu timestamps și durată per stagiu
- Checklist documente per stagiu \(CF, certificat fiscal, extras de carte funciară\)
- Task\-uri asociate cu deadline și responsabil
- Documente tranzacție: precontract, contract vânzare, facturi
- Note și istoric comunicări

## 5\.6\. CMA \(Comparație de Piață\)

Instrumentul de Comparative Market Analysis permite agentului să genereze rapoarte profesionale de evaluare\.

- Selectare proprietăți comparabile \(din baza proprie \+ date publice\)
- Criterii de comparabilitate: zonă, tip, suprafață, număr camere, an, stare
- Ajustări preț per criteriu \(etaj, orientare, renovare, parcare\)
- Preț recomandat calculat \(interval min\-max\)
- Preț per mp comparat cu media zonei
- Grafice: evoluție prețuri zonă, distribuire prețuri, timp pe piață
- Export PDF profesional cu branding agent
- Prezentare interactivă în portal client \(pentru justificarea prețului cerut\)

## 5\.7\. Vizionări & Open House

### 5\.7\.1\. Gestionare Vizionări

- Calendar vizionări cu filtrare per proprietate, per client
- Booking: agentul programează sau clientul solicită \(formularul pe micro\-site\)
- Reminder automat la 24h și 1h \(SMS/email/push\)
- Check\-in vizionare \(agentul marchează efectuată \+ nr\. participanți\)
- Formular feedback post\-vizionare \(trimis automat cumpărătorului\)
- Feedback vizibil în portalul proprietarului \(transparență\)
- Trasabilitate: care agent a adus cumpărătorul \(important pentru comision\)

### 5\.7\.2\. Open House

- Creare eveniment open house cu dată, interval orar, capacitate
- Pagină RSVP publică \(share pe social media\)
- Check\-in participanți \(formular rapid: nume, telefon, email, feedback\)
- Lead\-uri automat create din participanți
- Raport post\-event: nr\. participanți, lead\-uri, interes

## 5\.8\. Micro\-Site Agent

Fiecare agent primește un micro\-site profesional la agent\-slug\.estatecorepro\.com sau pe domeniu propriu\.

### Secțiuni Micro\-Site

- Hero: foto profesională, tagline, CTA \(„Vrei să vinzi?” \+ „Cauți casă?”\)
- Despre mine: bio, ani experiență, certificări, specialism \(rezidențial, comercial, teren\)
- Portofoliu activ: grid proprietăți cu filtre \(tip, preț, zonă, camere\)
- Proprietăți vândute: social proof cu preț și timp pe piață
- Testimoniale: review\-uri clienți cu stele, text, poză \(consent\-based\)
- Ghiduri: articole despre procesul de vânzare/cumpărare, documente necesare, sfaturi
- Evaluare gratuită: formular de solicitare evaluare proprietate \(lead magnet principal\)
- Căutare proprietate: formular criteriii cumpărător \(lead magnet secundar\)
- Contact: formular, telefon, email, link WhatsApp, program de lucru
- Footer: social links, ANPC, politici confidențialitate

### Pagină Individuală Proprietate

Fiecare proprietate activă are propria pagină SEO\-optimizată cu: galerie foto cu lightbox, virtual tour embed, hartă interactivă cu POI \(magazine, transport, școli, parcuri\), toate detaliile tehnice, cheltuieli estimate, formular de interes/programare vizionare, proprietăți similare \(cross\-sell\)\.

### Customizare & SEO

- Palette culori, logo, fonturi, 5\+ teme pre\-definite
- Custom CSS \(plan Team\)
- Custom domain support cu SSL automat \(Let's Encrypt\)
- SEO: meta tags, sitemap, structured data \(Schema\.org RealEstateListing\)
- Analytics: integrare GA4/GTM per micro\-site
- Eliminare badge „Powered by EstateCore Pro” \(plan Team\)

## 5\.9\. Marketing Kit

### 5\.9\.1\. Broșură Proprietate

- Generator automat broșură PDF din datele proprietății
- Template\-uri multiple: minimal, luxury, comercial, teren
- Branding agent: logo, culori, contact
- Include: poze, planșă, hartă, specificații, QR code către listing online
- Export PDF print\-ready \(A4, tipărire profesională\)
- Versiune digitală interactivă \(link shareabil\)

### 5\.9\.2\. Social Media Generator

- Template\-uri editabile: post Instagram \(feed, story, reel cover\), Facebook, LinkedIn
- Categorii: listing nou, preț redus, vândut, open house, testimonial, sfat imobiliar
- Auto\-populate cu datele proprietății \(poze, preț, suprafață, zonă\)
- Branding consistent \(logo, culori, font agent\)
- Export PNG/JPG \+ caption generat \(cu hashtag\-uri relevante\)
- Programare postare \(integrare Buffer/Later, plan Growth\+\)

### 5\.9\.3\. Email Marketing

- Template\-uri: listing nou, preț ajustat, open house, proprietate vândută, newsletter lunar
- Segmentare: cumpărători după criterii căutare, vânzători activi, clienți pasivi
- Matching automat: email „Noi proprietăți potrivite criteriilor tale”
- Merge tags: \{client\_name\}, \{property\_address\}, \{price\}, \{agent\_name\}
- Analytics: open rate, click rate, conversie la vizionare

### 5\.9\.4\. Lead Magnets

- Ghid gratuit: „10 Pași pentru a\-ți Vinde Apartamentul la Prețul Maxim”
- Ghid gratuit: „Checklist Cumpărare Apartament — Ce să Verifici”
- Evaluare gratuită proprietate \(formular → CMA rapid → follow\-up\)
- Calculator rate credit ipotecar \(embeddable widget\)
- Toate generează lead automat în pipeline CRM

### 5\.9\.5\. Sindicări Portaluri

Publicare automată a proprietăților pe portaluri externe\. Suport nativ pentru: Imobiliare\.ro \(API/XML feed\), Storia\.ro, OLX Imobiliare, Proprietari\.ro\. Sincronizare bidi\-recțională: statusul se actualizează automat\. Un singur loc de editare — se propagă pe toate portalurile\. Tracking: de unde vin lead\-urile \(atribuire canal\)\.

## 5\.10\. Calendar & Scheduling

- Calendar vizual cu tipuri: vizionare, open house, întâlnire client, notar, evaluare, photography
- Color\-coding per tip eveniment
- Sincronizare Google Calendar / Apple Calendar
- Booking widget pe micro\-site \(cumpărătorii programează vizionări\)
- Disponibilități configurabile per zi/interval
- Buffer timp între vizionări \(include deplasare\)
- Reminder SMS/email/push la 24h și 1h
- Recurring: întâlniri săptămânale cu echipa
- Vizualizare zi pe hartă \(toate vizionările pe hartă, rută optimă\)

## 5\.11\. Formulare & Chestionare

### Formulare Pre\-construite

- Intake vânzător: date proprietate, așteptări preț, urgență, acte disponibile
- Intake cumpărător: buget, zone, tipologie, criterii, sursa finanțării
- Feedback vizionare: rating general, ce a plăcut, ce nu, interes continuat
- NDA / Acord confidențialitate \(pentru proprietăți premium\)
- Consimțământ GDPR și prelucrare date
- Chestionar satisfacție post\-tranzacție
- Solicitare testimonial \(cu consimțământ publicare\)

## 5\.12\. Automatizări \(Workflow Engine\)

### Triggere Disponibile

- Lead nou din micro\-site / portal
- Vizionare efectuată
- Feedback vizionare completat
- Ofertă primită
- Contract exclusiv semnat
- Contract exclusiv expiră în X zile
- Proprietate listată de X zile fără vizionare
- Client inactiv X zile
- Tranzacție schimbă stagiu
- Tranzacție finalizată
- Zi de naștere client
- Aniversare tranzacție \(1 an de la vânzare\)

### Acțiuni Disponibile

- Trimite email \(template selectabil\)
- Trimite SMS \(via integrare\)
- Trimite notificare in\-app
- Generează raport activitate \(PDF\)
- Atribuie formular
- Mută lead în alt stagiu
- Creează task intern \(reminder agent\)
- Adaugă/elimină tag
- Trimite matching email \(proprietate → cumpărători potențiali\)
- Alertă echipă \(Slack/email\)
- Așteaptă X zile \(delay\)

### Workflow\-uri Pre\-construite

- Nurture Sequence Lead Nou: email imediat → 3 zile follow\-up → 7 zile CMA gratuit → 14 zile testimoniale
- Post\-Vizionare: feedback → 2 zile follow\-up → 5 zile ofertă sugerată
- Contract Expiră: 30 zile alert → 15 zile raport activitate → 7 zile propunere renewal
- Post\-Tranzacție: mulțumire → 30 zile NPS → 90 zile solicitate testimonial → 1 an aniversare
- Re\-Engagement: 60 zile inactiv → email „noile proprietăți” → 90 zile apel → 180 zile ultim mesaj

## 5\.13\. Analytics & Rapoarte

### Metrici Business

- Revenue total / estimat \(comisioane closed \+ pipeline\)
- Nr\. tranzacții finalizate \(lună, trimestru, an\)
- Valoare medie tranzacție
- Comision mediu
- Timp mediu pe piață \(days on market\)
- Preț cerut vs\. preț final \(raport de negociere\)
- Conversion rate: lead → vizionare → ofertă → tranzacție
- Sursa lead\-urilor \(micro\-site, Imobiliare\.ro, referral, social, organic\)
- ROI marketing per proprietate \(cost marketing / comision\)

### Metrici Activitate

- Vizionări efectuate \(total, per proprietate\)
- Oferte primite / acceptate / refuzate
- Contracte exclusive: active, renewal rate, success rate
- Task\-uri completate vs\. overdue
- Timp răspuns lead\-uri \(speed to lead\)

### Rapoarte

- Raport lunar automat \(email către agent\)
- Raport per proprietate \(activitate completă\)
- Raport per client \(istoric complet\)
- Raport echipă \(plan Team\): comparație agenți, leaderboard
- Export CSV / PDF

## 5\.14\. Mesagerie & Comunicare

- Chat real\-time agent\-client \(Supabase Realtime\)
- Thread\-uri per tranzacție \(context păstrat\)
- Suport media: imagini, documente, link\-uri proprietate
- Template\-uri răspuns rapid: „Vă confirm vizionarea\.\.\.”, „Documentele necesare sunt\.\.\.”
- Broadcast: mesaj către toți cumpărătorii dintr\-un segment \(„Listare nouă în zona X”\)
- Indicator read/delivered
- Notificări push \+ email fallback
- Ore de liniște configurabile

## 5\.15\. Evidență Comisioane

IMPORTANT: Platforma NU procesează plăți\. Modulul este exclusiv pentru tracking și evidență contabilă\.

- Comision per tranzacție: procent configurat, sumă calculată automat
- Status comision: de încasat, parțial, încasat, disputat
- Split comision \(când alt agent e implicat\): configurație procent
- Dashboard revenue: lunar, trimestrial, anual, forecast pipeline
- Export pentru contabilitate \(CSV cu toate datele necesare\)
- Reminder comisioane neîncasate

## 5\.16\. Task Manager

- Task\-uri asociate cu: proprietate, tranzacție, client, sau general
- Priorități: urgent, important, normal, low
- Due date cu reminder
- Checklist per stagiu tranzacție \(template predefinit\)
- Atribuire task la membrii echipei \(plan Team\)
- Vizualizare: listă, calendar, Kanban

# 6\. Funcționalități Portal Client \(Detaliate\)

Portalul clientului este instrumentul prin care EstateCore Pro justifică exclusivitatea\. Clientul vede transparență totală asupra activității agentului și are acces la toate informațiile relevante tranzacției sale\.

## 6\.1\. Dashboard Client Vânzător

- Status proprietate: număr vizualizari listing online, număr vizionări, număr oferte
- Timeline activitate agent: toate acțiunile loggate \(auto \+ manual\)
- Grafic interes: evoluția vizualizărilor și interesului în timp
- Ultimul raport de activitate \(PDF \+ interactiv\)
- Vizionări viitoare programate
- Feedback\-uri de la vizitatori
- Oferte primite \(sumă, condiții, status\)
- Documente: contract exclusiv, CMA, acte proprietate
- Mesaje cu agentul
- Stadiu tranzacție \(dacă există ofertă acceptată\)

## 6\.2\. Dashboard Client Cumpărător

- Shortlist proprietăți \(selectate de agent \+ salvate de client\)
- Comparator proprietăți: tabel comparativ \(preț, suprafață, locație, dotări\)
- Matching: proprietăți noi care corespund criteriilor salvate
- Calendar vizionări programate
- Istoric vizionări cu note și rating personal
- Oferte trimise și statusul lor
- Stadiu tranzacție \(dacă există ofertă acceptată\)
- Documente: precontract, acte, contract
- Calculator financiar: simulare rate credit ipotecar
- Mesaje cu agentul

## 6\.3\. Stadiu Tranzacție \(Vizualizare Client\)

Progress bar vizual cu stagiile tranzacției, indicând clar unde se află procesul\. La fiecare stagiu, clientul vede: ce s\-a întâmplat \(în cuvinte simple, nu jargon\), ce urmează, ce documente sunt necesare de la el, estimare timp până la următorul pas\. Notificări la fiecare schimbare de stagiu\.

## 6\.4\. Documente & Upload

- Clientul poate încărca: acte proprietate, extras CF, certificat fiscal, adeverințe, utilități
- Organizare pe categorii predefinite
- Checklist documente necesare per tip tranzacție \(vizibil ambelor părți\)
- Status document: solicitat, încărcat, verificat de agent, ok
- Notificare automată când agentul solicită un document nou
- Download contracte semnate, rapoarte, broșuri

## 6\.5\. Evaluare & CMA \(Viziune Client\)

Vânzătorul poate accesa raportul CMA generat de agent în format interactiv: vede proprietățile comparabile \(anonimizate\), înțelege cum s\-a ajuns la prețul recomandat, vede evoluția prețurilor în zona sa\. Acest instrument este esențial pentru alinierea așteptărilor de preț\.

## 6\.6\. Ghiduri & Educație

- Ghid pas cu pas: procesul de vânzare \(ce se întâmplă la fiecare etapă\)
- Ghid pas cu pas: procesul de cumpărare
- Documente necesare: listă completă per tip tranzacție
- FAQ: întrebări frecvente despre proces, costuri, termene
- Glosar termeni imobiliari
- Calculator costuri tranzacție \(notar, impozit, comision estimat, taxe\)

## 6\.7\. Notificări Client

- Vizionare nouă programată pe proprietatea ta
- Feedback nou de la un vizitator
- Ofertă nouă primită
- Raport de activitate disponibil
- Document solicitat
- Tranzacție a avansat la un nou stagiu
- Proprietate nouă potrivită criteriilor tale \(cumpărător\)
- Mesaj nou de la agent

## 6\.8\. Onboarding Client

### Vânzător

1. Invitație email cu link creare cont
2. Completare profil: date personale, date proprietate
3. Upload documente inițiale \(CF, acte\)
4. Accept GDPR \+ Terms
5. Revizuire CMA generat de agent
6. Semnare contract exclusivitate \(digital\)
7. Tutorial portalul meu

### Cumpărător

1. Invitație email sau auto\-înregistrare pe micro\-site
2. Completare profil: date personale, criterii căutare, buget
3. Accept GDPR \+ Terms
4. Primire shortlist inițial de proprietăți
5. Programare prima vizionare
6. Tutorial portalul meu

# 7\. Funcționalități Comune / Platformă

## 7\.1\. Autentificare & Securitate

- Clerk: email/password, Google, Apple Sign\-In
- 2FA opțional \(TOTP, SMS\)
- RBAC: Broker Owner, Team Leader, Agent, Client \(vânzător/cumpărător\)
- Supabase RLS pe fiecare tabel
- Encriptare AES\-256 at rest, TLS in transit
- Audit log acțiuni critice \(acces documente, modificări contract\)
- Session management \(auto\-logout, device tracking\)

## 7\.2\. GDPR & Compliance

- Consimțământ explicit colectare date personale și financiare
- Bază legală: contract \(pentru tranzacții\), consimțământ \(pentru marketing\)
- Dreptul la ștergere, export, portabilitate
- DPA între agent și platformă
- Reținere date configurabilă \(auto\-ștergere după X ani post\-tranzacție\)
- Cookie banner și politică confidențialitate
- Conformitate ANSPDCP \(autoritatea română de protecție date\)

## 7\.3\. Notificări

__Canal__

__Tipuri__

__Control__

In\-App

Toate evenimentele relevante

Granular per tip

Email

Rapoarte, lead\-uri, vizionări, oferte, documente

Per categorie opt\-in/out

SMS

Confirmare vizionare, reminder urgent

Doar evenimente critice

Push \(Browser\)

Mesaje, oferte noi

Toggle global

Push \(Mobile\)

Mesaje, lead\-uri, remindere

Per tip

WhatsApp

Notificări tranzacționale \(plan Growth\+\)

Template\-based

## 7\.4\. Integrări

### Faza 1 \(MVP\)

- Google Calendar / Apple Calendar \(iCal sync\)
- Stripe \(subscripții agenți\)
- Imobiliare\.ro \(XML feed listinguri\)
- Google Maps / Mapbox \(hărți proprietate\)

### Faza 2

- Storia\.ro, OLX Imobiliare \(listare\)
- DocuSign / Autogram \(semnătură electronică\)
- Matterport \(virtual tours embed\)
- WhatsApp Business API
- Google Analytics 4 / GTM

### Faza 3

- Zapier / Make \(automatizări externe\)
- Public API \(plan Team\+\)
- ANCPI / e\-Terra \(verificare cadastru, CF online\)
- Bănci partenere \(pre\-aprobare credit, calculator rate\)
- Slack / Microsoft Teams \(notificări echipă\)

## 7\.5\. Mobile Experience

Faza 1: PWA responsivă \(agent primește lead\-uri, gestionează vizionări, mesaje din mers\)\. Faza 2: Native app \(React Native/Expo\) cu: push nativ, camera quick\-capture proprietăți, GPS check\-in vizionări, offline access fișe proprietate\. Design mobile\-first pentru portal client \(majoritatea clienților accesează de pe mobil\)\.

## 7\.6\. Internaționalizare \(i18n\)

Suport multilingv din Faza 1: Română, Engleză\. Faza 2: Maghiară \(important pentru Transilvania\), Germană, Franceză\. Monedă afișată: EUR, RON, USD configurabil per listing\. Unități de măsură: mp \(default\), sqft \(market internațional\)\.

# 8\. Funcționalități AI \(Roadmap\)

Modulele AI utilizează Anthropic Claude API pentru a amplifica capacitățile agentului, nu pentru a\-l înlocui\.

## 8\.1\. AI Property Description Generator

Agentul introduce datele proprietății și AI generează o descriere profesională în mai multe variante \(formal, emoțional, tehnic\)\. Suport multilingv \(RO \+ EN simultan\)\. Optimizat pentru SEO \(keywords zonă, tip proprietate\)\.

## 8\.2\. AI Smart Matching

Matching inteligent proprietate\-cumpărător bazat pe: criterii explicite \(buget, zonă, tip\), criterii implicite \(feedback\-uri vizionări anterioare, pattern\-uri navigare\), scor compatibilitate procentual\. Alert automat când apare un match puternic\.

## 8\.3\. AI Pricing Advisor

Analiză comparații de piață și sugerează interval de preț optim\. Factori: tranzacții recente în zonă, trend prețuri, sezon, stare proprietate, timp pe piață dorit\. Sugerează ajustări de preț când proprietatea stagnează\.

## 8\.4\. AI Marketing Content

Generare automată: captions social media, articole blog, email\-uri campanii, texte broșuri\. Ton adaptabil: profesional, prietenos, luxurios, investitor\-focused\.

## 8\.5\. AI Contract Analyzer

Analiză documentelor tranzacției \(încărcate ca PDF\) și evidențiază: clauze nestandard, riscuri potențiale, date lipsă, inconsistențe\. Asistent de drafting pentru observații și solicitări de clarificare\.

## 8\.6\. AI Chatbot Vizitator

Chatbot pe micro\-site\-ul agentului care răspunde la întrebări despre proprietățile listate \(preț, suprafață, disponibilitate\) și captează lead\-uri \(„Vreți să programați o vizionare?”\)\. Operațional 24/7, escalează către agent pentru întrebări complexe\.

# 9\. Fluxuri Utilizator Cheie

## 9\.1\. Flux: Agent Nou → Primă Proprietate Exclusivă

1. Agentul se înregistrează \(Clerk\) → alege plan Stripe → verifică email
2. Completează profilul: bio, certificări, specializare, foto
3. Configurează micro\-site\-ul: culori, secțiuni, servicii
4. Adaugă prima proprietate: date, poze, documentație
5. Generează CMA pentru proprietate
6. Invită proprietarul \(email / link\)
7. Proprietarul accesează portalul, revizuiește CMA
8. Agentul generează contract exclusivitate din platformă
9. Proprietarul semnează digital contractul
10. Proprietatea se activează automat → se publică pe portaluri
11. Automatizările pornesc: marketing, matching cumpărători, rapoarte

## 9\.2\. Flux: Lead din Micro\-Site → Vizionare → Ofertă

1. Vizitatorul găsește proprietatea pe micro\-site sau portal
2. Completează formularul de interes / programare vizionare
3. Lead creat automat în pipeline CRM
4. Automatizare: email confirmare \+ detalii proprietate
5. Agentul contactează lead\-ul, califică, programează vizionare
6. Vizionare efectuată → check\-in → feedback solicitat automat
7. Feedback\-ul apare în portalul proprietarului \(transparență\)
8. Cumpărătorul interesat → agentul facilitează oferta
9. Ofertă prezentată proprietarului în portal \(sumă, condiții\)
10. Negociere → acceptare → tranzacție trece în stagiu „Precontract”

## 9\.3\. Flux: Tranzacție Completă \(Precontract → Notar\)

1. Agentul creează tranzacția în pipeline, asociază părțile
2. Checklist documente generat automat per tip tranzacție
3. Ambele părți încarcă documente în portal
4. Agentul verifică documentele și actualizează statusul
5. Precontract redactat și trimis pentru semnare
6. Programare notar
7. Checklist pre\-notar: toate actele verificate
8. Tranzacție finalizată → predare chei
9. Automatizări post\-tranzacție: mulțumire, NPS, testimonial, tracking comision

## 9\.4\. Flux: Raport Săptămânal pentru Client Vânzător

1. Automatizare declanșată săptămânal \(ex: vineri, 10:00\)
2. Sistem agregează activitățile din ultima săptămână
3. Generează raport PDF branduit \+ versiune portal
4. Trimite email clientului cu link către raport în portal
5. Clientul deschide raportul și vede: vizionări, feedback, marketing, interes online
6. Agentul este notificat când clientul deschide raportul

# 10\. Cerințe Non\-Funcționale

__Categorie__

__Cerință__

__Target__

Performanță

TTFB \(micro\-site\)

< 150ms \(edge, ISR\)

Performanță

LCP \(pagină proprietate\)

< 2\.5s \(imagini optimizate\)

Performanță

API Response \(P95\)

< 500ms

Performanță

Search \(PostGIS\)

< 200ms pentru 100K proprietăți

Scalabilitate

Concurrent Users

10\.000\+ simultan

Scalabilitate

Proprietăți în sistem

500\.000\+

Disponibilitate

Uptime SLA

99\.9%

Disponibilitate

RTO

< 1 oră

Disponibilitate

RPO

< 5 minute

Securitate

Documente legale

Encriptare AES\-256, acces auditat

Securitate

Stocare contracte

Imutabilitate \(append\-only log\)

Securitate

OWASP Top 10

Conformitate completă

Stocare

Poze per proprietate

Până la 50 \(500MB\)

Stocare

Documente per tranzacție

Până la 200MB

Accesibilitate

WCAG

2\.1 Level AA

SEO

Micro\-site

Score Lighthouse > 90

# 11\. Roadmap de Dezvoltare

## Faza 1: MVP \(Săptămânile 1\-14\)

__Sprint__

__Modul__

__Deliverables__

S1\-S2

Infrastructură

Next\.js, Supabase\+PostGIS, Clerk, Stripe, CI/CD, design system

S3\-S4

Proprietăți

CRUD proprietate, galerie foto, status, căutare geo

S5\-S6

CRM Core

Dashboard agent, client CRUD, pipeline lead, tags

S7\-S8

Contracte Exclusive

Generare contract, semnare \(upload\), tracking activitate, rapoarte

S9\-S10

Portal Client

Dashboard vânzător/cumpărător, timeline, documente, mesagerie

S11\-S12

Vizionări & Calendar

Scheduling, feedback, sincronizare calendar, reminders

S13\-S14

Micro\-Site & Launch

Micro\-site builder \(3 teme\), SEO, pagini proprietate, beta launch

## Faza 2: Growth \(Săptămânile 15\-28\)

__Sprint__

__Modul__

__Deliverables__

S15\-S16

CMA Tool

Comparabile, ajustări, grafice, export PDF, vizualizare portal

S17\-S18

Marketing Kit

Broșuri auto, social templates, email marketing

S19\-S20

Sindicări Portaluri

Imobiliare\.ro, Storia, OLX \(XML/API feed\)

S21\-S22

Automatizări

Workflow engine, templates, nurture sequences

S23\-S24

Analytics

Business metrics, rapoarte, export

S25\-S26

Semnătură Digitală

DocuSign/Autogram integrare, flux semnare complet

S27\-S28

Pipeline Tranzacții

Kanban avansat, checklists, task manager, comisioane

## Faza 3: Scale \(Săptămânile 29\-40\)

__Sprint__

__Modul__

__Deliverables__

S29\-S32

AI Features

Description generator, smart matching, pricing advisor

S33\-S34

Team Management

Multi\-agent, lead routing, team analytics, permissions

S35\-S36

Mobile App

React Native, push nativ, camera capture, GPS

S37\-S38

API & White\-Label

Public API, custom domains, white\-label

S39\-S40

Integrări Avansate

ANCPI/e\-Terra, WhatsApp, Zapier, bănci partenere

# 12\. Metrici de Succes \(KPIs\)

## 12\.1\. Business KPIs

__Metrică__

__Target 6 luni__

__Target 12 luni__

__Target 24 luni__

MRR

8\.000 EUR

40\.000 EUR

150\.000 EUR

Agenți activi

80

400

1\.500

Proprietăți listate \(total\)

2\.000

15\.000

60\.000

Churn rate agenți

< 8%/lună

< 5%/lună

< 3%/lună

ARPU

100 EUR

110 EUR

120 EUR

CAC

< 150 EUR

< 100 EUR

< 80 EUR

LTV/CAC

> 3x

> 5x

> 8x

## 12\.2\. Product KPIs

__Metrică__

__Target__

DAU/MAU Ratio \(agenți\)

> 65%

Contracte exclusive create în platformă / agent / lună

> 2

Rapoarte activitate trimise \(automat\)

> 90% din contracte

Timp mediu listing creat

< 20 minute

Portal client adoption \(clienți care accesează\)

> 75%

Vizionări loggate în platformă vs\. total

> 80%

NPS Score agenți

> 55

Micro\-site conversion \(vizitator → lead\)

> 6%

Speed to lead \(timp răspuns la lead nou\)

< 15 minute

Feature adoption \(CMA tool\)

> 70% agenți Growth\+

# 13\. Riscuri și Mitigații

__Risc__

__Impact__

__Prob\.__

__Mitigare__

Adoptare contracte exclusive în RO încă scăzută

Înalt

Înalt

Educație piață \(conținut, webinarii\), demonstrare ROI prin transparență

Integrare portaluri \(Imobiliare\.ro, Storia\) dificilă

Mediu

Mediu

XML feed standard, parteneriate, scraping fallback

GDPR: date personale sensibile în tranzacții

Înalt

Mediu

DPO consultant, audit, consimțământ granular, encriptare

Validitate juridică semnătură electronică RO

Înalt

Scăzut

eIDAS compliant, Autogram\.sk, fallback upload manual

Concurență CRM\-uri generice

Mediu

Mediu

Specializăre verticală, contracte exclusive ca niche

Dependență de API\-uri externe \(portaluri, hărți\)

Mediu

Mediu

Abstraction layers, fallback graceful, cache agresiv

Agenți fără competențe digitale

Mediu

Înalt

Onboarding concierge, video tutorials, UX simplificat

# 14\. Strategie Go\-To\-Market

## 14\.1\. Pre\-Launch

- Landing page cu waitlist și lead magnet \(„Ghidul Contractelor Exclusive” PDF\)
- 10\-15 agenți beta testers din București și Cluj \(acces gratuit 3 luni\)
- Parteneriate cu asociații profesionale \(APAIR, NAR, asociații locale\)
- Conținut LinkedIn/Facebook targetat agenți: „De ce exclusivitatea îți dublează veniturile”
- Webinarii gratuite: „Cum să convingi proprietarul de exclusivitate”

## 14\.2\. Launch

- Product Hunt launch
- Ofertă early adopter: 50% discount 6 luni
- Demo live la evenimentul APAIR / Real Estate Forum
- Campanie Facebook/Instagram targetată agenți imobiliari
- Referral: agent recomandă agent → 1 lună gratuit

## 14\.3\. Growth

- SEO: blog cu articole despre contracte exclusive, proces tranzacții, ghiduri juridice
- YouTube: tutoriale platformă, interviuri cu agenți de succes
- Certification: „EstateCore Certified Agent” badge pe micro\-site
- Parteneriate bănci/developeri: recomandă agenții din platformă
- Event sponsoring: targ imobiliar, evenimente agenții
- Cazuri de succes publicate: „Cum agentul X a vândut 30% mai rapid cu EstateCore”

## 14\.4\. Expansiune

- Faza 1: România \(focus București, Cluj, Timișoara, Iași, Brașov\)
- Faza 2: Moldova, Bulgaria, Ungaria \(piețe similare, reglementare comparabilă\)
- Faza 3: EU \(Spania, Portugalia, Grecia — piețe cu investiții străine\)

# 15\. Structură Proiect Next\.js

estatecore\-pro/

├── app/ \(App Router\)

│   ├── \(marketing\)/ — Landing page, pricing, blog, ghiduri

│   ├── \(auth\)/ — Sign in, sign up, forgot password

│   ├── dashboard/ — Agent dashboard \(protected\)

│   │   ├── properties/ — CRUD proprietăți, galerie, documente

│   │   ├── clients/ — CRM, profil client, pipeline leads

│   │   ├── contracts/ — Contracte exclusive, generare, semnare, tracking

│   │   ├── transactions/ — Pipeline tranzacții, checklists

│   │   ├── viewings/ — Vizionări, feedback, open house

│   │   ├── cma/ — Comparații de piață

│   │   ├── calendar/ — Scheduling complet

│   │   ├── messages/ — Chat

│   │   ├── marketing/ — Marketing kit, brosuri, email, social

│   │   ├── analytics/ — Reports, metrics

│   │   ├── automations/ — Workflow builder

│   │   ├── tasks/ — Task manager

│   │   ├── commissions/ — Evidență comisioane

│   │   ├── site\-builder/ — Micro\-site editor

│   │   └── settings/ — Profil, billing, branding, integrări

│   ├── portal/ — Client portal \(protected\)

│   │   ├── seller/ — Dashboard vânzător, rapoarte, timeline

│   │   ├── buyer/ — Dashboard cumpărător, shortlist, comparator

│   │   ├── transaction/ — Stadiu tranzacție, documente

│   │   ├── messages/ — Chat cu agentul

│   │   ├── documents/ — Upload/download documente

│   │   └── guides/ — Ghiduri, FAQ, calculator

│   ├── \[agent\-slug\]/ — Micro\-site public agent \(ISR/SSG\)

│   │   └── property/\[id\]/ — Pagină proprietate individuală

│   └── api/ — API routes, webhooks

├── components/ — UI components \(shadcn/ui\)

├── lib/ — Supabase client, Stripe, helpers, PostGIS queries

├── hooks/ — Custom React hooks

├── types/ — TypeScript types

└── supabase/ — Migrations, seed, RLS policies, PostGIS extensions

# 16\. Mapare Funcțională: FitCore Pro ↔ EstateCore Pro

Tabelul de mai jos arată cum fiecare concept din FitCore Pro se transpune în domeniul imobiliar:

__FitCore Pro \(Fitness\)__

__EstateCore Pro \(Real Estate\)__

__Notă__

Antrenor

Agent Imobiliar

Utilizatorul principal, plătește abonament

Client fitness

Client \(Vânzător / Cumpărător\)

Acces gratuit la portal

Program antrenament

Proprietate \+ Pipeline tranzacție

Produsul livrat

Plan nutriție

CMA \+ Evaluare \+ Strategie preț

Componenta analitică

Progres foto \(before/after\)

Galerie proprietate \+ Virtual tour

Documentație vizuală

Check\-in săptămânal

Raport activitate săptămânal

Transparență

Măsurători corporale

Metrici proprietate \(views, vizionări\)

Tracking progres

Workout tracker

Vizionări \+ Feedback

Logging activitate

Biblioteca exerciții

Biblioteca proprietăți \(listing\-uri\)

Catalog

Micro\-site antrenor

Micro\-site agent cu portofoliu

Prezență online

Marketing kit \(social\)

Marketing kit \(broșuri, social, email\)

Identic, adaptat

Automatizări

Automatizări \(nurture, expirare contract\)

Identic, triggere diferite

Gamificare \(badges\)

Performance badges agent

Motivație

Formular intake

Formular intake vânzător/cumpărător

Onboarding

NPS / Satisfaction

NPS \+ Testimonial post\-tranzacție

Feedback

—

Contract Exclusiv \(MODUL NOU\)

Diferențiator unic EstateCore

—

CMA Tool \(MODUL NOU\)

Evaluare automată

—

Pipeline Tranzacții \(MODUL NOU\)

Gestionare end\-to\-end

—

Sindicări Portaluri \(MODUL NOU\)

Publicare automată

—

Vizionări & Open House \(MODUL NOU\)

Specific imobiliar

# 17\. Appendix

## 17\.1\. Glosar

__Termen__

__Definiție__

CRM

Customer Relationship Management

CMA

Comparative Market Analysis — analiză comparativă de piață

Contract Exclusiv

Contract de reprezentare exclusivă între proprietar și agent

IDX

Internet Data Exchange — standard de partajare listing\-uri

MLS

Multiple Listing Service — bază de date comună agenți

DOM

Days on Market — zile pe piață

CF

Carte Funciară — registru proprietate

ANCPI

Agenția Națională de Cadastru și Publicitate Imobiliară

e\-Terra

Platforma electronică ANCPI

PostGIS

Extensie PostgreSQL pentru date geospațiale

RLS

Row Level Security — securitate la nivel de rând PostgreSQL

ISR

Incremental Static Regeneration — Next\.js

eIDAS

Regulament UE privind semnătura electronică

APAIR

Asociația Profesioniștilor în Real Estate

NAR

National Association of Realtors

ARPU

Average Revenue Per User

LTV

Lifetime Value

CAC

Customer Acquisition Cost

## 17\.2\. Document History

__Versiune__

__Data__

__Autor__

__Modificări__

1\.0

Aprilie 2026

Narcis

Document inițial complet

*— SFÂRȘIT DOCUMENT —*

