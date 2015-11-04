var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');
var USER = JSON.parse(PropertiesService.getUserProperties().getProperty('currentUser'));



function processProposalSubmission(formObj){
  var test, programId, userObj, user, school, newQueue, programQuery, programDataQuery, queryArray, newId, html;

  queryArray = [];
  programId = 'AEIP' + PropertiesService.getScriptProperties().getProperty('nextProgramId').toString();
  userObj = JSON.parse(PropertiesService.getUserProperties().getProperty('currentUser'));
  user = userObj.username;
  school = userObj.school;
  newQueue = userObj.queue ? null : 'P';
  programQuery = 'INSERT INTO Programs (program_id, program_name, school, post_date, '
        + 'application_deadline, number_of_positions, program_type, program_time, trimester, start_date, end_date, '
        + 'program_schedule, hours_per_trimester, eligibility_requirements, additional_requirements, selection_criteria, '
        + 'goals_outcomes, general_duties) VALUES("' + programId + '", "' + formObj.progName + '", "' + school + '", "'
        + formObj.postDate + '", "' + formObj.appDeadline + '", "' + formObj.posNum + '", "'
        + formObj.progType + '", "' + formObj.progTime + '", "' + formObj.progTri + '", "' + formObj.progStart + '", "'
        + formObj.progEnd + '", "' + formObj.progSched + '", "' + formObj.estHrs + '", "' + formObj.eligibility + '", "'
        + formObj.addReqs + '", "' + formObj.criteria + '", "' + formObj.goals + '", "' + formObj.duties + '")';
  programDataQuery = 'INSERT INTO Program_Data (program_id, submitted_by, date_submitted, queue, status) ' 
        + 'VALUES("' + programId + '", "' + user + '", "' + new Date() + '", "'  + newQueue + '", "New")';
  
  queryArray.push(programQuery);
  queryArray.push(programDataQuery);
  
  NVGAS.insertSqlRecord(dbString, queryArray);
  
  newId = (Number(PropertiesService.getScriptProperties().getProperty('nextProgramId')) + 1).toString();
  PropertiesService.getScriptProperties().setProperty('nextProgramId', newId);
  sendProgramSubmissionConfirmation(programId);
  sendProcessProposalSubmissionAlert(programId);
  
  html = HtmlService.createTemplateFromFile('new_proposal_confirmation');
  html.data = formObj;
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function sendProgramSubmissionConfirmation(program_id){
  var test, program, recipient, subject, html, template, queryArray, query;
  
  program = getProgramInfo(program_id);
  recipient = program.submitted_by;
  subject = "DO NOT REPLY: AEIP Proposal Confirmation | " + program.program_id;
  html = HtmlService.createTemplateFromFile('proposal_confirmation_email');
  html.program = program;
  template = html.evaluate().getContent();
  queryArray = [];
  
  GmailApp.sendEmail(recipient, subject,"",{htmlBody: template});
  
  query = 'UPDATE Program_Data SET proposal_submission_confirmation = "' + new Date() + '" WHERE program_id = "' + program_id + '"';
  queryArray.push(query);
  NVGAS.updateSqlRecord(dbString, queryArray);
}



function sendProcessProposalSubmissionAlert(program_id){
  var test, program, recipientQuery, recipients, subject, html, template, alertQuery;
  
  program = getProgramInfo(program_id);
  recipientQuery = 'SELECT username FROM Users WHERE roles LIKE "%P%"AND school = "' + program.school + '"';
  recipients = NVGAS.getSqlRecords(dbString, recipientQuery).map(function(e){
    return e.username;
  }).join();
  subject = "DO NOT REPLY: AEIP Proposal Submitted | " + program.program_id;
  html = HtmlService.createTemplateFromFile('proposal_submission_email_principal');
  html.program = program;
  html.url = PropertiesService.getScriptProperties().getProperty('leadershipUrl');
  template = html.evaluate().getContent();
  
  GmailApp.sendEmail(recipients, subject,"",{htmlBody: template});
  
  alertQuery = 'UPDATE Program_Data SET proposal_submission_principal = "' + new Date() + '" WHERE program_id = "' + program_id + '"';
  NVGAS.updateSqlRecord(dbString, [alertQuery]);
}



function getProgramInfo(program_id){
  var test, query, program;
  
  query = 'SELECT * FROM Programs p INNER JOIN Program_Data d ON p.program_id = d.program_id WHERE p.program_id = "' + program_id + '"';
  program = NVGAS.getSqlRecords(dbString, query)[0];
  return program;
}



function getApprovalActionItems(){
  var test, queue, nr, tbf, html;
  
  queue = JSON.parse(getProgramsByRole());
  nr = queue.filter(function(e){
    return (e.status == 'New');
  });

  html = HtmlService.createTemplateFromFile('action_items');
  html.newClass = nr.length > 0 ? 'nvRed' : 'nvGreen';
  html.nr = nr.length;

  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function getProgramsByRole(){
  var test, username, userQuery, roles, programs;

  username = USER.username;
  school = USER.school;
  userQuery = 'SELECT roles FROM Users WHERE username = "' + username + '"';
  roles = NVGAS.getSqlRecords(dbString, userQuery).map(function(e){
    return e.roles;
  });
 
  programs = JSON.stringify(roles.map(function(e){
    var query = 'SELECT * FROM Programs p INNER JOIN Program_Data d on p.program_id = d.program_id WHERE (d.queue = "' + e + '") AND (p.school = "' + school + '")';
    return NVGAS.getSqlRecords(dbString, query);
  }).reduce(function(e){
    return e;
  }));

  CacheService.getUserCache().put('rolePrograms', programs);
  return programs;
}



function loadNewPrograms(){
  var test, queue, data, html;

  queue = JSON.parse(CacheService.getUserCache().get('rolePrograms')) || getProgramsByRole();
  data = queue.filter(function(e){
    return e.status == 'New';
  });
  
  html = HtmlService.createTemplateFromFile('new_programs_table');
  html.data = data;
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function loadNewProposalForm(program_id){
  var test, html;

  html = HtmlService.createTemplateFromFile('proposal_approval_form');
  html.program = getProgramInfo(program_id);
  html.approver = USER.username;
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function loadEditProposalForm(programId){
  var test;

  html = HtmlService.createTemplateFromFile('edit_proposal_modal');
  html.proposal = getProgramInfo(programId);
  html.program = JSON.stringify(html.proposal);
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function processProposalEdits(formObj){
  var test, queryArray, programId, editQuery, timeStampQuery, html;

  queryArray = [];
  programId = JSON.parse(formObj.eProgram).program_id;
  editQuery = 'UPDATE Programs SET program_name = "' + formObj.eProgName + '", post_date = "' + formObj.ePostDate + '", application_deadline = "' + formObj.eAppDeadline + '", number_of_positions = "' + formObj.ePosNum + '", program_type = "' + formObj.eProgType + '", program_time = "' + formObj.eProgTime + '", trimester = "' + formObj.eProgTri + '", start_date = "' + formObj.eProgStart + '", end_date = "' + formObj.eProgEnd + '", program_schedule = "' + formObj.eProgSched + '", hours_per_trimester = "' + formObj.eEstHrs + '", eligibility_requirements = "' + formObj.eEligibility + '", additional_requirements = "' + formObj.eAddReqs + '", selection_criteria = "' + formObj.eCriteria + '", goals_outcomes = "' + formObj.eGoals + '", general_duties = "' + formObj.eDuties + '" WHERE program_id = "' + programId + '"';
  timeStampQuery = 'UPDATE Program_Data SET program_edit = "' + new Date() + '", queue = "P" WHERE program_id = "' + programId + '"';

  queryArray.push(editQuery);
  queryArray.push(timeStampQuery);

  NVGAS.updateSqlRecord(dbString, queryArray);

  sendProposalEditNotification(programId);

  html = HtmlService.createTemplateFromFile('edit_proposal_confirmation');
  html.data = getProgramInfo(programId);
  return html.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
}



function sendProposalEditNotification(programId){
  var test, proposal, recipientQuery, recipients, subject, html, template, query, queryArray;

  // Get program information
  proposal = getProgramInfo(programId);

  // Email notification of proposal edit
  recipientQuery = 'SELECT username FROM Users WHERE (roles LIKE "%P%" OR roles like "%DSO%") AND school = "' + proposal.school + '"';
  recipients = NVGAS.getSqlRecords(dbString, recipientQuery).map(function(e){
    return e.username;
  }).join();
  subject = 'DO NOT REPLY: AEIP Proposal Edited | ' + proposal.program_id;
  html = HtmlService.createTemplateFromFile('edited_proposal_email');
  html.proposal = proposal;
  html.url = PropertiesService.getScriptProperties().getProperty('leadershipUrl');
  template = html.evaluate().getContent();
  GmailApp.sendEmail(recipients, subject,"",{htmlBody: template});

  // Update Program_Data table
  queryArray = [];
  query = 'UPDATE Program_Data SET proposal_edit_email = "' + new Date() + '" WHERE program_id = "' + programId + '"';
  queryArray.push(query);
  NVGAS.updateSqlRecord(dbString, queryArray);
}