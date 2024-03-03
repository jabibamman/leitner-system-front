const { setWorldConstructor, After, Before } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

class CustomWorld {
  async launchBrowser() {
    this.browser = await chromium.launch();
    this.page = await this.browser.newPage();
  }

  async closeBrowser() {
    await this.page.close();
    await this.browser.close();
  }
}

setWorldConstructor(CustomWorld);

Before(async function () {
  await this.launchBrowser();
});

After(async function () {
  await this.closeBrowser();
});

module.exports = {
  default: `--require-module ts-node/register 
            --require tests/e2e/**/*.steps.ts 
            --publish-quiet 
            tests/features/**/*.feature`
};
