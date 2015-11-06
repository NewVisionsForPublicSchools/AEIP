var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');
var USER = JSON.parse(PropertiesService.getUserProperties().getProperty('currentUser'));
var APPLICATIONTEMPLATEID = PropertiesService.getScriptProperties().getProperty('applicationTemplateId');



function getCurrentApplications(){
	var test;

	// Create html template
	html = HtmlService.createTemplateFromFile('applications_page');

	// Attach program data to html template
	html.data = getOpenApplications();

	// Return html template for applications page
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function loadApplicationForm(programId){
	// Create template
	html = HtmlService.createTemplateFromFile('application_modal');

	// Add program info to template
	html.data = getProgramInfo(programId);

	// Return template
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function getOpenApplications(){
	var test, query, approvedPrograms, openApplications;

	// Query database for programs with open application windows
	query = 'SELECT * FROM Programs p INNER JOIN Program_Data d ON p.program_id = d.program_id WHERE d.application_window = "Open"';
	approvedPrograms = NVGAS.getSqlRecords(dbString, query);

	// Filter query results for programs by school
	openApplications = approvedPrograms.filter(function(e){
		return e.school == USER.school;
	});

	// Return open applications
	return openApplications;
}



function processApplication(formObj){
	var test, applicationId, html;

	// Add application to db
	applicationId = setApplicationInfo(formObj);

	// Send application submission confirmation email
	sendApplicationSubmissionConfirmation(applicationId);

	// Create PDF of application
	createApplicationPdf(applicationId);

	// Send application to DSO
	sendApplicationToDso(applicationId);

	// Return submission confirmation
	html = HtmlService.createTemplateFromFile('application_submission_confirmation');
	html.data = getProgramInfo(formObj.appProgram);
	return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function setApplicationInfo(formObj){
	var test, applicationId, appQuery, appDataQuery, queryArray, newId;

	// Get application Id
	applicationId = formObj.appProgram + 'A' + PropertiesService.getScriptProperties().getProperty('nextApplicationId').toString();

	// Insert info into Applications table
	appQuery = 'INSERT INTO Applications (application_id, proposed_schedule, criteria, outcomes, progress_measure, resources, special_events, target_enrollment, participation_rate, terms, payment_acknowledgement, program_id) VALUES("' + applicationId + '", "' + formObj.proposedSched + '", "' + formObj.criteriaReqs + '", "' + formObj.appGoals + '", "' + formObj.appProgress + '", "' + formObj.appNeeds + '", "' + formObj.appEvents + '", "' + formObj.appTarget + '", "' + formObj.appParticipation + '", "' + formObj.appTerms + '", "' + formObj.appPayment + '", "' + formObj.appProgram + '")';

	// Update Application_Data table
	appDataQuery = 'INSERT INTO Application_Data (application_id, applicant, date_submitted, queue) VALUES("' + applicationId + '", "' + USER.username + '", "' + new Date() + '", "DSO")';

	// Run SQL queries
	queryArray = [];
	queryArray.push(appQuery);
	queryArray.push(appDataQuery);
	NVGAS.insertSqlRecord(dbString, queryArray);

	// Update application Id script property
	newId = (Number(PropertiesService.getScriptProperties().getProperty('nextApplicationId')) + 1).toString();
	PropertiesService.getScriptProperties().setProperty('nextApplicationId', newId);

	// Return application Id
	return applicationId;
}



function sendApplicationSubmissionConfirmation(applicationId){
	var test, query, programName, recipients, subject, html, template, alertQuery;

	// Get program name
	query = 'SELECT program_name FROM Programs p INNER JOIN Applications a ON p.program_id = a.program_id WHERE a.application_id = "' + applicationId + '"';
	programName = NVGAS.getSqlRecords(dbString, query)[0].program_name;

	recipients = USER.username;
	subject = 'DO NOT REPLY: AEIP Application Confirmation | ' + applicationId;

	// Get email body
	html = HtmlService.createTemplateFromFile('application_submission_email_confirmation');
	html.programName = programName;
	html.url = PropertiesService.getScriptProperties().getProperty('leadershipUrl');
	template = html.evaluate().getContent();

	// Email confirmation
	GmailApp.sendEmail(recipients, subject, "", {htmlBody: template});

	// Update Application_Data table
	alertQuery = 'UPDATE Application_Data SET application_confirmation = "' + new Date() + '" WHERE application_id = "' + applicationId + '"';
	NVGAS.updateSqlRecord(dbString, [alertQuery]);
}



function createApplicationPdf(applicationId){
	var test, application, program, schoolQuery, school, applicationFolder, template, filename, workingDocId, workingDoc, finalDoc, updateQuery;

	// Get application and program information
	application = getApplicationInfo(applicationId);
	program = getProgramInfo(application.program_id);


	// Get school application folder
	schoolQuery = 'SELECT s.school, s.application_folder_id FROM Schools s INNER JOIN Programs p ON s.school = p.school WHERE p.program_id = "' + application.program_id + '"';
	school = NVGAS.getSqlRecords(dbString, schoolQuery)[0];
	applicationFolder = DriveApp.getFolderById(school.application_folder_id);

	// Create copy of template
	template = DriveApp.getFileById(APPLICATIONTEMPLATEID);
	filename = program.program_name + ' | ' + USER.employee_name + ' | ' + applicationId;
	workingDocId = template.makeCopy(filename).getId();

	// Merge application info into document
	workingDoc = DocumentApp.openById(workingDocId);
	getDocumentMergeFields(workingDoc).forEach(function(e){
		var key = e.split('<<')[1].split('>>')[0];
		if(key in program){
			workingDoc.getBody().replaceText(e, program[key]);
		}
		if(key in USER){
			workingDoc.getBody().replaceText(e, USER[key]);
		}
		if(key in application){
			workingDoc.getBody().replaceText(e, application[key]);
		}
		workingDoc.getFooter().replaceText(e, program[key]);
		return;
	});

	// Cleanup documents
	workingDoc.saveAndClose();
	finalDoc = applicationFolder.createFile(DriveApp.getFileById(workingDocId).getAs('application/pdf'));
	DriveApp.getFileById(workingDocId).setTrashed(true);

	// Update Program_data table
	updateQuery = 'UPDATE Application_Data SET pdf_id = "' + finalDoc.getId() + '", pdf_url = "' + finalDoc.getUrl() + '" WHERE application_id = "' + applicationId + '"';
	NVGAS.updateSqlRecord(dbString, [updateQuery]);
}



function getApplicationInfo(applicationId){
	var test, query;

	query = 'SELECT * FROM Applications a INNER JOIN Application_Data d ON a.application_id = d.application_id WHERE a.application_id = "' + applicationId + '"';
	return NVGAS.getSqlRecords(dbString, query)[0];
}



function sendApplicationToDso(applicationId){
	var test, appInfo, program, recipientQuery, recipients, subject, html, template, fileQuery, fileId, application, updateQuery;

	// Get application info
	appInfo = getApplicationInfo(applicationId);
	program = getProgramInfo(appInfo.program_id);

	// Get recipients
	recipientQuery = 'SELECT username FROM Users WHERE roles LIKE "%DSO%" AND school = "' + USER.school + '"';
	recipients = NVGAS.getSqlRecords(dbString, recipientQuery).map(function(e){
		return e.username;
	}).join();

	subject = 'AEIP Application Submitted | ' + USER.employee_name + ' | ' + program.program_name;

	// Get message body
	html = HtmlService.createTemplateFromFile('application_submission_email_dso');
	html.program = program;
	html.appInfo = appInfo;
	html.applicant = USER;
	html.url = PropertiesService.getScriptProperties().getProperty('leadershipUrl');
	template = html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();

	// Get attachment
	fileQuery = 'SELECT pdf_id FROM Application_Data WHERE application_id = "' + applicationId + '"';
	fileId = NVGAS.getSqlRecords(dbString, fileQuery)[0].pdf_id;
	application = DriveApp.getFileById(fileId);

	// Send email
	GmailApp.sendEmail(recipients, subject, "", {htmlBody: template, attachments: application});

	// Update Application_Data table
	updateQuery = 'UPDATE Application_Data SET submission_notification = "' + new Date() + '" WHERE application_id = "' + applicationId + '"';
	NVGAS.updateSqlRecord(dbString, [updateQuery]);
}



function setOpenApplicationWindow(){
	var test, approvedQuery, approvedPrograms, today, openWindows, queryArray;

	// Get approved programs
	approvedQuery = 'SELECT * FROM Programs p INNER JOIN Program_Data d ON p.program_id = d.program_id WHERE d.status = "Approved"';
	approvedPrograms = NVGAS.getSqlRecords(dbString, approvedQuery);

	// Filter approved programs for open windows
	today = new Date().getTime();
	openWindows = approvedPrograms.filter(function(e){
		e.post_date = new Date(e.post_date.split('-')[0],e.post_date.split('-')[1] - 1,e.post_date.split('-')[2]).getTime();
		e.application_deadline = new Date(e.application_deadline.split('-')[0],e.application_deadline.split('-')[1]-1,e.application_deadline.split('-')[2]).getTime();
		return (today >= e.post_date) && (today <= e.application_deadline) && (e.application_window != "Closed");
	});

	// Update Program_Data table
	queryArray = [];
	openWindows.forEach(function(e){
		updateQuery = 'UPDATE Program_Data SET application_window = "Open" WHERE program_id = "' + e.program_id + '"';
		queryArray.push(updateQuery);
	});
	NVGAS.updateSqlRecord(dbString, queryArray);
}