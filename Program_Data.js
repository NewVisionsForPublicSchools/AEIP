var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');



function processPrincipalProposalResponse(formObj){
	var test, queryArray, program, today, postDate, appDeadline, queue, status, justificationQuery, moreInfoQuery, responseQuery, html;

	queryArray = [];
	program = getProgramInfo(formObj.programId);
	today = new Date().getTime();
	postDate = new Date(program.post_date.split('-')[0].program.post_date.split('-')[1]-1,program.post_date.split('-')[2]).getTime();
	appDeadline = new Date(program.application_deadline.split('-')[0].program.application_deadline.split('-')[1]-1,program.application_deadline.split('-')[2]).getTime();

	switch(formObj.principalResponse){
		case 'Yes':
			createProgramAnnouncement(formObj.programId);
			sendProgramAnnouncement(formObj.programId);
			setOpenApplicationWindow();
			queue = "";
			status = "Approved";
			if((today >= postDate) && (today <= appDeadline)){
				setOpenApplicationWindow();
			}
			break;
		case 'No':
			sendRejectionNotification(formObj.programId, formObj.principalProposalJustification);
			justificationQuery = 'UPDATE Program_Data pd SET pd.principal_proposal_justification = "' + formObj.principalProposalJustification.trim() + '" WHERE pd.program_id = "' + formObj.programId + '"';
			queryArray.push(justificationQuery);
			queue = "";
			status = "Rejected";
			break;
		case 'More Information Needed':
			sendMoreInfoNotification(formObj.programId, formObj.principalMoreInfoReason);
			moreInfoQuery = 'UPDATE Program_Data pd SET pd.principal_proposal_more_info = "' + formObj.principalMoreInfoReason.trim() + '" WHERE pd.program_id = "' + formObj.programId + '"';
			queryArray.push(moreInfoQuery);
			queue = "DSO";
			status = "Under Review";
			break;
		default:
			break;
	}

	responseQuery = 'UPDATE Program_Data pd SET pd.principal_proposal_response = "' + formObj.principalResponse + '", pd.queue = "' + queue + '", pd.proposal_response_date = "' + new Date() + '", pd.status = "' + status + '" WHERE pd.program_id = "' + formObj.programId + '"';
	queryArray.push(responseQuery);
	NVGAS.insertSqlRecord(dbString, queryArray);

	html = HtmlService.createTemplateFromFile('principal_proposal_response_confirmation');
	html.program = program;
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function sendRejectionNotification(programId, justification){
	var test, program, recipientQuery, recipient, subject, html, template, queryArray, notificationQuery;

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



function sendMoreInfoNotification(programId, reason){
	var test;

	program = getProgramInfo(programId);
	recipientQuery = 'SELECT username FROM Users WHERE (roles LIKE "%P%" OR roles LIKE "%DSO%") AND school = "' + program.school + '"';
	recipient = NVGAS.getSqlRecords(dbString, recipientQuery).map(function(e){
		return e.username;
	}).join();
	subject = 'More Information Needed AEIP Proposal | ' + program.program_name + ' | ' + programId;
	html = HtmlService.createTemplateFromFile('more_info_proposal_email');
	html.program = program;
	html.reason = reason;
	html.url = PropertiesService.getScriptProperties().getProperty('leadershipUrl');
	template = html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
	GmailApp.sendEmail(recipient, subject,"",{htmlBody: template});
	queryArray = [];
	notificationQuery = 'UPDATE Program_Data SET proposal_more_info_notification = "' + new Date() + '" WHERE program_id = "' + programId + '"';
	queryArray.push(notificationQuery);
	NVGAS.insertSqlRecord(dbString, queryArray);
}