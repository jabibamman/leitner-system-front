#!/usr/bin/env node
/**
 * Importe les cartes d'un export JSON vers l'API Leitner.
 *
 * Usage :
 *   node scripts/import-cards.mjs <fichier.json> [URL_API]
 *
 * URL_API par defaut : http://localhost:8080 (dev local).
 * Pour importer vers Render : node scripts/import-cards.mjs cartes.json https://<ton-service>.onrender.com
 *
 * Idempotent au niveau du script (pas au niveau de l'API, qui n'a pas de
 * contrainte d'unicite sur la question) : relancer le script sur une API
 * deja peuplee crée des doublons. Prevu pour un import unique sur une base
 * vide.
 */
import { readFile } from 'node:fs/promises'

const [, , filePath, apiUrlArg] = process.argv

if (!filePath) {
  console.error('Usage: node scripts/import-cards.mjs <fichier.json> [URL_API]')
  process.exit(1)
}

const apiUrl = (apiUrlArg ?? 'http://localhost:8080').replace(/\/+$/, '')

const raw = await readFile(filePath, 'utf-8')
const data = JSON.parse(raw)
const cards = data.cards ?? data

if (!Array.isArray(cards)) {
  console.error("Le fichier ne contient pas de tableau de cartes (clé 'cards' ou tableau racine).")
  process.exit(1)
}

console.log(`Import de ${cards.length} cartes vers ${apiUrl}...`)

let created = 0
let failed = 0

for (const card of cards) {
  const payload = {
    question: card.q ?? card.question,
    answer: card.a ?? card.answer,
    tag: card.deck ?? card.tag,
    // Le type est optionnel côté API : ATOMIC par défaut si absent.
    type: (card.type ?? 'atomic').toUpperCase(),
  }

  if (!payload.question || !payload.answer) {
    console.warn(`  ✗ ${card.id ?? '(sans id)'} — question ou réponse manquante, ignorée`)
    failed++
    continue
  }

  try {
    const res = await fetch(`${apiUrl}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text()
      console.warn(`  ✗ ${card.id} — HTTP ${res.status}: ${body}`)
      failed++
      continue
    }
    created++
  } catch (err) {
    console.warn(`  ✗ ${card.id} — ${err.message}`)
    failed++
  }
}

console.log(`\nTerminé : ${created} créées, ${failed} échouées sur ${cards.length}.`)
if (failed > 0) process.exitCode = 1
