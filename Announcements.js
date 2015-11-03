var ANNOUNCEMENT = PropertiesService.getScriptProperties().getProperty('announcementId');
var ANNOUNCEMENTFOLDER = PropertiesService.getScriptProperties().getProperty('announcementFolderId');
var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');



function createProgramAnnouncement(programId){
	var test, prg, tempDoc, name, destination, workingDocId, workingDoc, mergeFields, body, footer, pdf, queryArray, query;

	prg = getProgramInfo(programId);
	prg.application_link = PropertiesService.getScriptProperties().getProperty('appUrl');
	name = prg.school + " | " + prg.program_name + " | " + prg.program_id;
	destination = DriveApp.getFolderById(ANNOUNCEMENTFOLDER);
	tempDoc = DriveApp.getFileById(ANNOUNCEMENT).makeCopy(name);
	workingDocId = tempDoc.getId();
	workingDoc = DocumentApp.openById(workingDocId);
	mergeFields = getDocumentMergeFields(workingDoc);
	body = workingDoc.getBody();
	footer = workingDoc.getFooter();
	mergeFields.forEach(function(e){
		var key = e.split('<<')[1].split('>>')[0];
		body.replaceText(e, prg[key]);
		footer.replaceText(e, prg[key]);
		return;
	});
	workingDoc.saveAndClose();
	pdf = destination.createFile(tempDoc.getAs('application/pdf'));
	tempDoc.setTrashed(true);

	queryArray = [];
	query = 'INSERT INTO Announcements (program_id, pdf_id, pdf_url, date_created) VALUES("' + prg.program_id + '", "' + pdf.getId() + '", "' + pdf.getUrl() + '", "' + new Date() + '" )';
	queryArray.push(query);
	NVGAS.insertSqlRecord(dbString, queryArray);
}



function getDocumentMergeFields(document){
	var test, temp, fields, fieldExp, body, footer, match, element, start, end, length, i, mergeFields;

	temp = [];
	fields = [];
	fieldExp = "[<]{2,}\\S[^,]*?[>]{2,}";
	body = document.getBody();
	footer = document.getFooter();
	temp[0] = body.findText(fieldExp) || footer.findText(fieldExp);
	element = temp[0].getElement().asText().getText();
	start = temp[0].getStartOffset();
	end = temp[0].getEndOffsetInclusive() + 1;
	length = end - start;
	fields.push(element.substr(start, length));
	i = 0;
	while(fields[i]){
		temp[i+1] = body.findText(fieldExp, temp[i]) || footer.findText(fieldExp, temp[i]);
		if(temp[i+1]){
			element = temp[i+1].getElement().asText().getText();
			start = temp[i+1].getStartOffset();
			end = temp[i+1].getEndOffsetInclusive() + 1;
			length = end - start;
			fields.push(element.substr(start, length));
		}
		i++;
	}
	mergeFields = NVGAS.unique(fields);
	return mergeFields;
}



function sendProgramAnnouncement(programId){
	var test, program, recipientQuery, recipient, subject, html, template, fileQuery, fileId, announcement;

	program = getProgramInfo(programId);
	recipientQuery = 'SELECT username FROM Users WHERE (roles LIKE "%P%" OR roles LIKE "%DSO%") AND school = "' + program.school + '"';
	recipient = NVGAS.getSqlRecords(dbString, recipientQuery).map(function(e){
		return e.username;
	}).join();
	subject = 'Approved AEIP Proposal | ' + program.program_name + ' | ' + programId;
	html = HtmlService.createTemplateFromFile('approved_proposal_email');
	html.program = program;
	html.url = PropertiesService.getScriptProperties().getProperty('leadershipUrl');
	template = html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
	fileQuery = 'SELECT pdf_id FROM Announcements WHERE program_id = "' + programId + '"';
	fileId = NVGAS.getSqlRecords(dbString, fileQuery)[0].pdf_id;
	announcement = DriveApp.getFileById(fileId);
	GmailApp.sendEmail(recipient, subject,"",{htmlBody: template, attachments: announcement});
	queryArray = [];
	notificationQuery = 'UPDATE Program_Data SET program_announcement_notification = "' + new Date() + '" WHERE program_id = "' + programId + '"';
	queryArray.push(notificationQuery);
	NVGAS.insertSqlRecord(dbString, queryArray);
}