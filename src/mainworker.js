import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs"
import path from "path";
import { Worker } from 'worker_threads';



const resultDestination = "./src/resultData/results.txt"
const logFilePath = `./src/logs/log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`; // Unique log file

/* 
--- Approach 1 (using Promise.all()).
*/

/*

export default async function concurentInput(urlList) {
    const writer = fs.createWriteStream(resultDestination);
    const browser = await puppeteer.launch();
    const wordCount = await Promise.all(
        urlList.map(async (url) => {
            const data = await legacyWordCount(url, browser);
            console.log("data", data);
            writer.write(`${data} \n`);
            return data;
        })
    );
    writer.end()
    return wordCount;
}

async function legacyWordCount(url, browser) {
    const rawData = await webPageScrapper(url, browser);
    const words = rawData.split(/\s+/).filter(Boolean);
    const finalData = `${url} : ${words.length}`;
    return finalData;
}


async function webPageScrapper(url, browser) {
    const page = await browser.newPage();

    try {
        // Open the Wikipedia page
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Extract the content of the article (usually inside <div id="bodyContent">)
        const articleContent = await page.evaluate(() => {
            // Get the article text within the bodyContent div
            const bodyContent =
                document.getElementById("bodyContent");
            return bodyContent ? bodyContent.innerText : "";
        });

        return articleContent;
    } catch (error) {
        console.error(`Error scraping ${url}: ${error.message}`);
        return ""; // In case of an error, return an empty string
    } finally {
        // Close the browser
        await page.close();
    }
}

*/



/* 
--- Approach 2 (using worker_threads).
*/


// Creating a seprate log file to monitor all the operations of main and service worker
function logToFile(message) {
  fs.appendFileSync(logFilePath, message + '\n', { flag: 'a' });
}

// Main Worker responsible for genrating service worker and terminates the worker
export default async function getWordCount(urlList) {
  const writer = fs.createWriteStream(resultDestination, { flags: 'a' });

  const workerPromises = urlList.map(url => {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./src/serviceWorker.js');
      const pid = worker.threadId; 
      const timestamp = new Date().toISOString();

      const startMessage = `[MAIN] Worker PID: ${pid}, Handling URL: ${url}, Timestamp: ${timestamp}`;
      console.log(startMessage);
      logToFile(startMessage);

      worker.postMessage({ url, logFilePath }); // Pass the log file path to the worker


      // using "on message" event recived from worker service then process it accordingly 
      worker.on('message', (result) => {
        const successMessage = `[MAIN] Worker PID: ${pid}, Completed URL: ${url}, Timestamp: ${new Date().toISOString()}`;
        console.log(successMessage);
        logToFile(successMessage);
        writer.write(`${result}\n`); // Log result to the main data file
        worker.terminate();
        resolve();
      });

      // error handling if any worker gives erorr in between
      worker.on('error', (error) => {
        const errorMessage = `[MAIN] Worker PID: ${pid}, Error with URL: ${url}, Timestamp: ${new Date().toISOString()}, Error: ${error.message}`;
        console.error(errorMessage);
        logToFile(errorMessage);
        writer.write(`${url} : 0 (Worker Error)\n`); // Log failed URL with zero count
        worker.terminate();
        reject(error);
      });

      // Event to exit the Main worker
      worker.on('exit', (code) => {
        if (code !== 0) {
          const exitMessage = `[MAIN] Worker PID: ${pid}, Exit code: ${code}, URL: ${url}`;
          console.error(exitMessage);
          logToFile(exitMessage);
        }
      });
    });
  });

  await Promise.all(workerPromises);
  writer.end();
}
