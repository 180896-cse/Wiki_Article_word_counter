// service worker for the concurent wikipidea article and word counts
import puppeteer from "puppeteer";
import { parentPort, threadId } from 'worker_threads';
import fs from 'fs';


// function for log file
function logToFile(logFilePath, message) {
  fs.appendFileSync(logFilePath, message + '\n', { flag: 'a' });
}


// main function for service worker
async function countWord(url, browser, logFilePath) {
  try {
    // passing url, browserinstance and log File path
    const rawData = await webPageScrapper(url, browser, logFilePath);
    
    // filtering out the white spaces
    const words = rawData.split(/\s+/).filter(Boolean);

    // getting the length of word
    const wordCount = words.length;


    // Error Handling if Article body is empty
    if (wordCount === 0) {
      const emptyMessage = `[WORKER ${threadId}] URL: ${url}, Empty Content, Timestamp: ${new Date().toISOString()}`;
      logToFile(logFilePath, emptyMessage);
      return `${url} : 0 (Empty Content)`;
    }

    const successMessage = `[WORKER ${threadId}] URL: ${url}, Word Count: ${wordCount}, Timestamp: ${new Date().toISOString()}`;
    logToFile(logFilePath, successMessage);
    return `${url} : ${wordCount}`;
  } 
  catch (error) {
    const errorMessage = `[WORKER ${threadId}] URL: ${url}, Error: ${error.message}, Timestamp: ${new Date().toISOString()}`;
    logToFile(logFilePath, errorMessage);
    return `${url} : 0 (Error: ${error.message})`;
  }
}


// main scrapper function to scrap the data fro paticular webpage
async function webPageScrapper(url, browser, logFilePath) {
  const page = await browser.newPage();
  try {
    const startMessage = `[WORKER ${threadId}] URL: ${url}, Starting Scraping, Timestamp: ${new Date().toISOString()}`;
    logToFile(logFilePath, startMessage);

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const articleContent = await page.evaluate(() => {
      const bodyContent = document.getElementById("bodyContent");
      return bodyContent ? bodyContent.innerText : "";
    });

    return articleContent;
  } catch (error) {
    const scrapingError = `[WORKER ${threadId}] URL: ${url}, Scraping Failed, Timestamp: ${new Date().toISOString()}, Error: ${error.message}`;
    logToFile(logFilePath, scrapingError);
    throw new Error(`Scraping failed for ${url}`);
  } finally {
    const closeMessage = `[WORKER ${threadId}] URL: ${url}, Closing Page, Timestamp: ${new Date().toISOString()}`;
    logToFile(logFilePath, closeMessage);
    await page.close();
  }
}


// after processing sending message back parent
parentPort?.on('message', async ({ url, logFilePath }) => {
  const browser = await puppeteer.launch();
  const browserStartMessage = `[WORKER ${threadId}] URL: ${url}, Browser Launched, Timestamp: ${new Date().toISOString()}`;
  logToFile(logFilePath, browserStartMessage);

  try {
    const result = await countWord(url, browser, logFilePath);
    parentPort?.postMessage(result);
  } catch (error) {
    const workerError = `[WORKER ${threadId}] URL: ${url}, Browser Error: ${error.message}, Timestamp: ${new Date().toISOString()}`;
    logToFile(logFilePath, workerError);
    parentPort?.postMessage(`${url} : 0 (Error: ${error.message})`);
  } finally {
    const browserCloseMessage = `[WORKER ${threadId}] URL: ${url}, Browser Closed, Timestamp: ${new Date().toISOString()}`;
    logToFile(logFilePath, browserCloseMessage);
    await browser.close();
  }
});
