import { test } from '@playwright/test';

const questions = {
  chromium: 'Quelle est la définition du Clean Code ?',
  webkit: 'Qu\'est-ce que le DDD ?',
  firefox: 'Citez les principes SOLID.',
};

const answers = {
    chromium: 'Code facile à lire, à comprendre et à maintenir',
    webkit: 'Domain Driven Design',
    firefox: 'Single Responsibility Principle, Open/Closed Principle, Liskov Substitution Principle, Interface Segregation Principle, Dependency Inversion Principle',
};

const tags = {
  chromium: 'Programmation',
  webkit: 'Architecture',
  firefox: 'Conception',
};

test.describe('Tests spécifiques pour chaque navigateur', () => {
    let browserName;

    test.beforeEach(async ({}, testInfo) => {
        browserName = testInfo.project.name;
    });
        
    test(`Créer une nouvelle carte selon le navigateur`, async ({ page }) => {
        const question = questions[browserName];
        const answer = answers[browserName];
        const tag = tags[browserName];

        await page.goto('http://localhost:5173/card');
        await page.click('text=Créer une carte');
        await page.waitForSelector('.v-dialog', { state: 'visible' });
        await page.fill('#newCard_question', question);
        await page.fill('#newCard_tag', tag);
        await page.fill('#newCard_answer', answer);
        await page.click('#create-button');
        await page.waitForTimeout(1000);
        const lastCard = await page.$('.v-card:last-child');
        if (lastCard) {
          const lastCardID = await lastCard.getAttribute('id');
          console.log(`L'ID de la dernière carte est : ${lastCardID}`);
        }
      });
});