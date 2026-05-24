"use client";

import { Shield, Database, Lock, UserCheck, ClipboardCheck, Eye } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { SectionLabel } from "@/components/marketing/section-label";
import { useI18n } from "@/lib/i18n/provider";

const sections = [
  {
    icon: Shield,
    titleEn: "Ethical Use of AI",
    titleFr: "Usage éthique de l'IA",
    bodyEn:
      "AutiVision is designed as a clinical decision-support tool, not as a diagnostic device. The AI model produces a risk probability and a risk tier based on facial imagery; it never replaces the clinical judgment of a qualified healthcare professional. Every result is accompanied by an explicit disclaimer reminding the evaluating clinician of this boundary. The system is intended to accelerate referral prioritisation and structure the clinical conversation — not to generate autonomous decisions.",
    bodyFr:
      "AutiVision est conçu comme un outil d'aide à la décision clinique, et non comme un dispositif de diagnostic. Le modèle d'intelligence artificielle produit une probabilité de risque et un niveau de risque à partir d'une image faciale ; il ne remplace jamais le jugement clinique d'un professionnel de santé qualifié. Chaque résultat est accompagné d'un avertissement explicite rappelant cette limite au clinicien évaluateur. Le système vise à accélérer la priorisation des orientations et à structurer la conversation clinique — non à générer des décisions autonomes.",
  },
  {
    icon: Database,
    titleEn: "Licensed & Legal Training Dataset",
    titleFr: "Jeu de données d'entraînement licencié et légal",
    bodyEn:
      "The deep-learning model powering AutiVision was trained exclusively on a publicly available, ethically sourced dataset published for research purposes under a permissive open-data licence. No patient data collected through the AutiVision platform is used to re-train or fine-tune the model. The dataset provenance, licence terms, and model performance metrics are documented in the accompanying dissertation manuscript.",
    bodyFr:
      "Le modèle d'apprentissage profond qui alimente AutiVision a été entraîné exclusivement sur un jeu de données public, éthiquement sourcé et publié à des fins de recherche sous une licence open-data permissive. Aucune donnée patiente collectée via la plateforme AutiVision n'est utilisée pour ré-entraîner ou affiner le modèle. La provenance du jeu de données, les conditions de licence et les métriques de performance du modèle sont documentés dans le manuscrit de thèse associé.",
  },
  {
    icon: Lock,
    titleEn: "Patient Privacy & Data Protection",
    titleFr: "Confidentialité des patients et protection des données",
    bodyEn:
      "Patient records in AutiVision are stored under an auto-generated anonymous code — no directly identifying information (full name, national ID, address) is recorded in the clinical database. Facial images are stored in an isolated, access-controlled storage bucket. All database tables are protected by row-level security (RLS) policies enforced at the database level, ensuring that each doctor can only access their own patients' data. Data is hosted on Supabase infrastructure with encryption at rest and in transit.",
    bodyFr:
      "Les dossiers patients dans AutiVision sont stockés sous un code anonyme généré automatiquement — aucune information directement identifiante (nom complet, numéro national, adresse) n'est enregistrée dans la base de données clinique. Les images faciales sont stockées dans un compartiment de stockage isolé, à accès contrôlé. Toutes les tables de la base de données sont protégées par des politiques de sécurité au niveau des lignes (RLS) appliquées au niveau de la base de données, garantissant que chaque médecin ne peut accéder qu'aux données de ses propres patients. Les données sont hébergées sur l'infrastructure Supabase avec chiffrement au repos et en transit.",
  },
  {
    icon: UserCheck,
    titleEn: "Authenticated Access Only",
    titleFr: "Accès réservé aux utilisateurs authentifiés",
    bodyEn:
      "The AutiVision clinical platform is fully protected behind authentication. No clinical data, patient records, screening results, or reports are accessible to unauthenticated users. Every route inside the application is guarded by session middleware that verifies the user's identity and role before serving any data.",
    bodyFr:
      "La plateforme clinique AutiVision est entièrement protégée derrière une authentification. Aucune donnée clinique, aucun dossier patient, résultat de dépistage ou rapport n'est accessible aux utilisateurs non authentifiés. Chaque route de l'application est protégée par un middleware de session qui vérifie l'identité et le rôle de l'utilisateur avant de servir toute donnée.",
  },
  {
    icon: ClipboardCheck,
    titleEn: "Secure Doctor Account Validation",
    titleFr: "Validation sécurisée des comptes médecins",
    bodyEn:
      "Doctor accounts are not automatically activated upon registration. Each new account is placed in a 'pending' state and must be explicitly approved by a platform administrator before the doctor gains access to any clinical functionality. This manual validation step ensures that only authorised healthcare professionals can use the screening and reporting tools. Administrators can also revoke access at any time.",
    bodyFr:
      "Les comptes médecins ne sont pas automatiquement activés lors de l'inscription. Chaque nouveau compte est placé à l'état « en attente » et doit être explicitement approuvé par un administrateur de la plateforme avant que le médecin ait accès à toute fonctionnalité clinique. Cette étape de validation manuelle garantit que seuls les professionnels de santé autorisés peuvent utiliser les outils de dépistage et de rapport. Les administrateurs peuvent également révoquer l'accès à tout moment.",
  },
  {
    icon: Eye,
    titleEn: "Security & Confidentiality Measures",
    titleFr: "Mesures de sécurité et de confidentialité",
    bodyEn:
      "AutiVision implements multiple layers of security: role-based access control (RBAC) restricts each user to the actions permitted by their role; database row-level security ensures strict data isolation between doctors; all communications between the browser and the server use HTTPS/TLS encryption; passwords are never stored in plain text and are managed through Supabase Auth's secure hashing mechanisms; and session tokens are stored as HttpOnly cookies with short-lived refresh cycles.",
    bodyFr:
      "AutiVision implémente plusieurs couches de sécurité : le contrôle d'accès basé sur les rôles (RBAC) limite chaque utilisateur aux actions autorisées par son rôle ; la sécurité au niveau des lignes de la base de données assure une isolation stricte des données entre les médecins ; toutes les communications entre le navigateur et le serveur utilisent le chiffrement HTTPS/TLS ; les mots de passe ne sont jamais stockés en clair et sont gérés par les mécanismes de hachage sécurisé de Supabase Auth ; et les jetons de session sont stockés sous forme de cookies HttpOnly avec des cycles de rafraîchissement de courte durée.",
  },
];

export default function EthicsPage() {
  const { locale } = useI18n();
  const isFr = locale === "fr";

  return (
    <>
      {/* Hero */}
      <section className="relative pb-12 pt-40">
        <div className="container-av max-w-4xl space-y-6">
          <Reveal>
            <SectionLabel label={isFr ? "Éthique & Légal" : "Ethics & Legal"} />
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="font-display text-display-xl font-bold text-balance">
              {isFr
                ? "Engagement éthique et cadre légal"
                : "Ethical commitment and legal framework"}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-2xl text-lg text-muted-foreground">
              {isFr
                ? "AutiVision est développé dans le respect des principes éthiques de l'IA médicale, de la protection des données personnelles et de la confidentialité des patients."
                : "AutiVision is developed in accordance with the ethical principles of medical AI, personal data protection, and patient confidentiality."}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Sections */}
      <section className="section-pad">
        <div className="container-av max-w-3xl space-y-10">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.titleEn} delay={i * 0.05}>
                <article className="flex gap-5">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-xl font-bold">
                      {isFr ? s.titleFr : s.titleEn}
                    </h2>
                    <p className="leading-relaxed text-muted-foreground">
                      {isFr ? s.bodyFr : s.bodyEn}
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}

          {/* Disclaimer box */}
          <Reveal>
            <div className="rounded-xl border border-border bg-card p-6 mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isFr ? "Avertissement" : "Disclaimer"}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isFr
                  ? "AutiVision est un projet académique (PFE — 2026) développé à des fins de recherche et d'aide à la décision clinique. Il n'est pas un dispositif médical certifié et n'est pas destiné à un usage clinique en production sans validation complémentaire par des professionnels de santé qualifiés."
                  : "AutiVision is an academic project (PFE — 2026) developed for research and clinical decision-support purposes. It is not a certified medical device and is not intended for production clinical use without additional validation by qualified healthcare professionals."}
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
