const cds = require("@sap/cds");
const { documentEventmesh } = require("./handler");
const { Document_info } = cds.entities;

class MessageService extends cds.ApplicationService {
    async init() {
        const messaging = await cds.connect.to("messaging");
        this.on("sendMessage", documentEventmesh.sendMessage);
        messaging.on(["test", "OwnEvent"], async (msg) => {
            console.log("1st listener received:", msg);
        });
        messaging.on("invoicetopic", async (msg) => {
            const { id, filename, documentType } = msg.data;
            await INSERT({
                filename,
                documentType,
                ID: id
            }).into(Document_info);
        });
        this.on("extractInfo", documentEventmesh.extractDocInfo);
        this.on("sendMessageTopic", documentEventmesh.createMessage);
        return super.init();
    }
}

module.exports = {
    MessageService,
};
