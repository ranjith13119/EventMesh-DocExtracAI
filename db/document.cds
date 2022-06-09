namespace message_app.db;

@cds.autoexpose
entity Document_info {
    key ID : UUID;
    fileName : String;
    documentType : String;
}

