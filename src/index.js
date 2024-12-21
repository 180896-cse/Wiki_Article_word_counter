import getWordCount from "./mainworker.js"
import urlList from "./sampleData/sampleData.js"

/**OVERVIEW**/
/* This Problem can be solved  
1. By using Promise.all() method
2. By using Multithreading concept using Worker service Method.
*/


// Main
function main() {
    try {
        getWordCount(urlList);
    } catch (error) {
        console.log('Error Occured in main File:', error);
    }

}


main();