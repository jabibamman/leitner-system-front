import { expect, test } from '@playwright/test'

const API = 'http://localhost:8080'

type Fixture = { question: string; answer: string; tag: string }

const cardsByBrowser: Record<string, Fixture> = {
  chromium: {
    question: 'Quelle est la définition du Clean Code ?',
    answer: 'Code facile à lire, à comprendre et à maintenir',
    tag: 'Programmation',
  },
  webkit: {
    question: "Qu'est-ce que le DDD ?",
    answer: 'Domain Driven Design',
    tag: 'Architecture',
  },
  firefox: {
    question: 'Citez les principes SOLID.',
    answer: 'Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion',
    tag: 'Conception',
  },
}

/**
 * L'API est simulée : le test valide le parcours de l'interface, pas le back,
 * et reste donc exécutable en CI sans base de données.
 */
test.describe('Création de fiches', () => {
  test('Créer une nouvelle carte', async ({ page }, testInfo) => {
    const fixture = cardsByBrowser[testInfo.project.name] ?? cardsByBrowser.chromium
    const created: unknown[] = []

    await page.route(`${API}/cards`, async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        created.push(body)
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'created-card-id', category: 'FIRST', ...body }),
        })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route(`${API}/cards?**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    await page.goto('/card')

    // Le bouton de création est un bouton flottant : on le cible par son
    // libellé accessible plutôt que par son texte.
    await page.getByRole('button', { name: 'Créer une carte' }).click()
    await expect(page.locator('.v-dialog')).toBeVisible()

    await page.fill('#newCard_question', fixture.question)
    await page.fill('#newCard_tag', fixture.tag)
    await page.fill('#newCard_answer', fixture.answer)
    await page.click('#create-button')

    await expect(page.locator('.v-dialog')).toBeHidden()
    // Le type par défaut du formulaire est ATOMIC : le sélecteur Atomique/Oral
    // n'est pas manipulé dans ce parcours.
    expect(created).toEqual([
      { question: fixture.question, answer: fixture.answer, tag: fixture.tag, type: 'ATOMIC' },
    ])
    // La carte créée est ajoutée en tête de liste.
    await expect(page.locator('#card-created-card-id')).toContainText(fixture.question)
  })

  test('Le champ question est obligatoire', async ({ page }) => {
    await page.route(`${API}/cards**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    await page.goto('/card')
    await page.getByRole('button', { name: 'Créer une carte' }).click()
    await page.click('#create-button')

    await expect(page.getByText('La question est obligatoire')).toBeVisible()
    await expect(page.locator('.v-dialog')).toBeVisible()
  })
})
