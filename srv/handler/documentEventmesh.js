const cds = require("@sap/cds");
const xenv = require("@sap/xsenv");
const axios = require("axios");
const btoa = require("btoa");
const qs = require("qs");
const FormData = require("form-data");

let msgSRV = xenv.getServices({ "enterprise-messaging": { name: "emdev" } });
let documentSRV = xenv.getServices({
    "document-information-extraction-trial": {
        label: "document-information-extraction-trial",
    },
});

const createMessage = async (req) => {
    try {
        const oMessages = msgSRV && msgSRV['enterprise-messaging'].messaging;
        let restMessrv = oMessages.filter(lmessage => lmessage.protocol[0] == 'httprest');
        const { clientid, clientsecret, tokenendpoint } = restMessrv && restMessrv[0] && restMessrv[0].oa2;
        const token = await getEMAccessToken(clientid, clientsecret, tokenendpoint)

        await axios
            .request({
                url: `/messagingrest/v1/topics/${req.data.topicName}/messages`,
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-qos': 0,
                    'content-type': 'application/json'
                },
                baseURL: restMessrv && restMessrv[0] && restMessrv[0].uri,
                data: { message: req.data.message }
            }).then(res => {
                return res
            }).catch(err => {
                console.log(err);
                throw new Error(err);
            });

        return `Successfully posed the message to the topic - ${req.data.topicName}`;
    } catch (err) {
        req.error(err);
    }
};

const getEMAccessToken = async (...tokenParams) => {

    try {
        const basicAuth = btoa(`${tokenParams[0]}:${tokenParams[1]}`);
        const headers = {
            authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        };
        return await axios
            .post(
                tokenParams[2],
                qs.stringify({ grant_type: "client_credentials" }),
                {
                    headers: headers,
                }
            )
            .then((response) => {
                return response.data.access_token;
            })
            .catch((error) => {
                throw new Error(error);
            });
    } catch (err) {
        throw new Error("Some Error has occured. The cause is" + err);
    }
};

const sendMessage = async () => {
    const messaging = await cds.connect.to("messaging");
    await messaging.emit({
        event: "test",
        data: { number: 12 },
        headers: {},
    });

    messaging.emit("OwnEvent", {
        data: { ID: "asdf", name: "asdf" },
    });
    return "Successfully sent the message to the Topic";
};

const extractDocInfo = async (req) => {
    try {
        const { fileContent, fileName } = req.data;
        const token = await getAccessTokenDE();

        const form = new FormData();
        form.append(
            "options",
            JSON.stringify({
                extraction: {
                    headerFields: [
                        "documentNumber",
                        "taxId",
                        "taxName",
                        "purchaseOrderNumber",
                        "shippingAmount",
                        "netAmount",
                        "grossAmount",
                        "currencyCode",
                        "receiverContact",
                        "documentDate",
                        "taxAmount",
                        "taxRate",
                        "receiverName",
                        "receiverAddress",
                        "receiverTaxId",
                        "deliveryDate",
                        "paymentTerms",
                        "deliveryNoteNumber",
                        "senderBankAccount",
                        "senderAddress",
                        "senderName",
                        "dueDate",
                        "discount",
                        "barcode",
                    ],
                    lineItemFields: [
                        "description",
                        "netAmount",
                        "quantity",
                        "unitPrice",
                        "materialNumber",
                        "unitOfMeasure",
                    ],
                },
                clientId: "default",
                receivedDate: "2020-02-17",
                enrichment: {
                    sender: {
                        top: 5,
                        type: "businessEntity",
                        subtype: "supplier",
                    },
                    employee: {
                        type: "employee",
                    },
                },
            })
        );
        form.append("file", new Buffer(fileContent, "base64"), {
            filename: fileName,
        });

        const { url } =
            documentSRV && documentSRV["document-information-extraction-trial"];

        const docId = await axios
            .request({
                url: "/document-information-extraction/v1/document/jobs",
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "content-type": "multipart/form-data",
                },
                baseURL: url,
                data: form,
            })
            .then((response) => {
                return response && response.data.id;
            })
            .catch((err) => {
                throw new Error(err);
            });
        await delay(5000);
        // Need to call this service after 5sec. Pre-Model needs to extact the information from pdf.
        const { id, documentType, status } = await axios.get(url + "/document-information-extraction/v1/document/jobs/" + docId, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async (response) => {
                return response.data;
            })
            .catch((err) => {
                throw new Error(err);
            });
        const messaging = await cds.connect.to("messaging");
        messaging.emit({
            event: "invoicetopic",
            data: { id, fileName, documentType },
            headers: {},
        });

        return `Successfully processed the document Extraction for ${id} : ${fileName} with status - ${status}`;
    } catch (err) {
        req.error("Some Error has occured. The cause is" + err);
    }
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const getAccessTokenDE = async () => {
    try {
        const { clientid, clientsecret, url } =
            documentSRV &&
            documentSRV["document-information-extraction-trial"] &&
            documentSRV["document-information-extraction-trial"].uaa;
        const basicAuth = btoa(`${clientid}:${clientsecret}`);
        const headers = {
            authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        };
        return await axios
            .post(
                url + "/oauth/token?grant_type=client_credentials",
                qs.stringify({ grant_type: "client_credentials" }),
                {
                    headers: headers,
                }
            )
            .then((response) => {
                return response.data.access_token;
            })
            .catch((error) => {
                throw new Error(error);
            });
    } catch (err) {
        throw new Error("Some Error has occured. The cause is" + err);
    }
};

module.exports = { sendMessage, extractDocInfo, createMessage };
