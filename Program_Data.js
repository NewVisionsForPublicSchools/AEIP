var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');



function processPrincipalProposalResponse(formObj){
	var test, queryArray, queue, justificationQuery, responseQuery, html;

	queryArray = [];
	

	switch(formObj.principalResponse){
		case 'Yes':
			createProgramAnnouncement(formObj.programId);
			sendProgramAnnouncement(formObj.programId);
			queue = "";
			break;
		case 'No':
			sendRejectionNotification(formObj.programId, formObj.principalProposalJustification);
			justificationQuery = 'UPDATE Program_Data pd SET pd.principal_proposal_justification = "' + formObj.principalProposalJustification + '" WHERE pd.program_id = "' + formObj.programId + '"';
			queryArray.push(justificationQuery);
			queue = "";
			break;
		default:
			break;
	}

	responseQuery = 'UPDATE Program_Data pd SET pd.principal_proposal_response = "' + formObj.principalResponse + '", pd.queue = "' + queue + '", pd.proposal_response_date = "' + new Date() + '" WHERE pd.program_id = "' + formObj.programId + '"';
	queryArray.push(responseQuery);
	NVGAS.insertSqlRecord(dbString, queryArray);

	html = HtmlService.createTemplateFromFile('principal_proposal_response_confirmation');
	html.program = getProgramInfo(formObj.programId);
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function sendRejectionNotification(programId, justification){
	var test;

	program = getProgramInfo(programId);
	recipientQuery = 'SELECT username FROM Users WHERE (roles LIKE "%P%" OR roles LIKE "%DSO%") AND school = "' + program.school + '"';
	recipient = NVGAS.getSqlRecords(dbString, recipientQuery).map(function(e){
		return e.username;
	}).join();
	subject = 'Rejected AEIP Proposal | ' + program.program_name + ' | ' + programId;
	html = HtmlService.createTemplateFromFile('rejected_proposal_email');
	html.program = program;
	html.justification = justification;
	template = html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
	GmailApp.sendEmail(recipient, subject,"",{htmlBody: template});
	queryArray = [];
	notificationQuery = 'UPDATE Program_Data SET program_rejection_notification = "' + new Date() + '" WHERE program_id = "' + programId + '"';
	queryArray.push(notificationQuery);
	NVGAS.insertSqlRecord(dbString, queryArray);
}