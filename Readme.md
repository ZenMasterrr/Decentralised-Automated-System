<--(.env file for frontend)-->
NEXT_PUBLIC_SEPOLIA_RPC_URL=" "
ETHERSCAN_API_KEY=" "
NEXT_PUBLIC_ZAP_CONTRACT_ADDRESS=" "
NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS=" "
NEXT_PUBLIC_HOOKS_URL=http://localhost:3002
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=GOCSPX-
GOOGLE_REDIRECT_URI=http://localhost:3002/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
PORT=3002
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_NETWORK=sepolia




<--(.env file for hooks)-->
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/zapier
SEPOLIA_RPC_URL=" "
PRIVATE_KEY=" "
ETHERSCAN_API_KEY=" "
ZAP_CONTRACT_ADDRESS=" "
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_ENDPOINT=email-smtp.eu-north-1.amazonaws.com
FROM_EMAIL=
JWT_SECRET=
NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS=" "
NEXT_PUBLIC_HOOKS_URL=http://localhost:3002
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3002/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
PORT=3002
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/zapier_test
NODE_ENV=test


<--(.env file for root folder)-->
# To get a private key, you can create a new wallet in MetaMask and export the private key.
# To get a Sepolia RPC URL, you can use a service like Infura or Alchemy.
SEPOLIA_RPC_URL=" "
PRIVATE_KEY=" "
ETHERSCAN_API_KEY=" "
ZAP_CONTRACT_ADDRESS=" "





Commands to Start The project - 

cd hooks
npm install
docker compose up -d
npx prisma migrate dev       
npx prisma migrate deploy   
npx prisma generate  
npx prisma db seed            
npm run dev  

cd keeper
npm install
npx hardhat run scripts/register-keeper.js --network sepolia
npx ts-node src/keeper-v2.ts

cd frontend
npm install
npm run dev

