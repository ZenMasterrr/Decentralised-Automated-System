import { ethers } from "ethers";



async function main() {
    console.log("Starting keeper...");

    while (true) {
        console.log("Checking for triggers...");
        
        await new Promise(resolve => setTimeout(resolve, 10000)); 
    }
}

main();
