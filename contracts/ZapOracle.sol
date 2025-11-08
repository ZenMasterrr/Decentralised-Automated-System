// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "./Zap.sol";

contract ZapOracle is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    Zap public zapContract;

    // Other oracle-related variables

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    // Chainlink Functions router address on Sepolia
    address router = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;

    // JavaScript source code
    string source = "const to = args[0];\nconst subject = args[1];\nconst body = args[2];\n\nif (!secrets.smtpPassword) {\n  throw Error(\"SMTP_PASSWORD environment variable not set\");\n}\n\nconst emailRequest = Functions.makeHttpRequest({\n  url: \"https://api.sendgrid.com/v3/mail/send\",\n  method: \"POST\",\n  headers: {\n    \"Authorization\": `Bearer ${secrets.sendgridApiKey}`,\n    \"Content-Type\": \"application/json\",\n  },\n  data: {\n    personalizations: [{ to: [{ email: to }] }],\n    from: { email: \"your-verified-sendgrid-email@example.com\" },\n    subject: subject,\n    content: [{ type: \"text/plain\", value: body }],\n  },\n});\n\nconst [response] = await Promise.all([emailRequest]);\n\nreturn Functions.encodeString(response.data);";

    // Subscription ID
    uint64 subscriptionId = 0; // We will populate this later

    // Gas limit for the fulfillment callback
    uint32 gasLimit = 300000;

    // donID - Hardcoded for Sepolia
    bytes32 donID = 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;

    constructor(address _zapContractAddress) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        zapContract = Zap(_zapContractAddress);
    }

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    function sendEmail(
        string[] memory args
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source); // Initialize the request
        if (args.length > 0) req.setArgs(args); // Set the arguments for the request

        // Send the request and store the request ID
        s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donID);

        return s_lastRequestId;
    }


    function fulfillRequest(
        bytes32 /*requestId*/,
        bytes memory response,
        bytes memory err
    ) internal override {
        s_lastResponse = response;
        s_lastError = err;
    }
}
