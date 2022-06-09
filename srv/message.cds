using message_app.db as message_app from '../db/document';

service MessageService {
    function sendMessage()                                                      returns String;

    @topic : 'topic1'
    event OwnEvent {
        ID   : String;
        name : String;
    }

    action   extractInfo(@Core.MediaType : mediaType fileContent : LargeBinary, fileName : String) returns String;
    entity Document_info as projection on message_app.Document_info;
    action sendMessageTopic(topicName : String, message : String) returns String;
}
