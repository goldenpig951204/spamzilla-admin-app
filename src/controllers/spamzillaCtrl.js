const crypto = require("node:crypto");
const settingModel = require("../models/setting");
const credentialModel = require("../models/credential");
const { spamzillaLog } = require("../services/logger");
const { get } = require("lodash");
const dvAxios = require("devergroup-request").default;
const parseHTML = require("jquery-html-parser");
const puppeteer = require("puppeteer-extra");
const axios = new dvAxios({
    axiosOpt: {
        timeout: 30000
    }
});

const login = async (req, res) => {
    try {
        let { email, password } = req.body;
        
        const browser = await puppeteer.launch({
            headless: false, timeout: 100000
        });
        const page = await browser.newPage();
        await page.goto('https://www.spamzilla.io/account/login/', {waitUntil: 'load', timeout: 100000});
        await page.focus("#loginform-email").then(async () => {
            await page.keyboard.type(email, { delpay: 100 });
        });
        await page.focus("#loginform-password").then(async () => {
            await page.keyboard.type(password, { delpay: 100 });
        });
        await Promise.all([
            page.waitForNavigation({waitUntil: 'load', timeout : 100000}),
            page.click('.custom-submit-btn')
        ]).then(async (result) => {
            if (/account\/login/.test(page.url())) {
                await browser.close(true);
                spamzillaLog.error(`Start session with ${email} failed.`);
                res.status(500).send("Credential is incorrect.");
            } else {
                let cookies = await page.cookies();
                await browser.close(true);
                let cookie = "";
                for( let idx in cookies) {
                    cookie += cookies[idx].name + "=" + cookies[idx].value + "; ";
                }
                await credentialModel.findOneAndUpdate(null, {
                    type: "spamzilla",
                    username: email,
                    password: password
                }, {
                    upsert: true
                });
                await settingModel.findOneAndUpdate(null, {
                    spamzillaCookie: cookie
                }, {
                    upsert: true
                });
                spamzillaLog.info(`Start session with ${email} successfully.`);
                res.send('Login successfully.');
            }
        });
    } catch (err) {
        spamzillaLog.error(`Start session with ${name} failed: ${get(err, "response.data.message") || err.toString()}`);
        res.status(500).send(get(err, "response.data.message") || err.toString());
    }
}

module.exports = {
    login
};