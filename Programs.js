var dbString = PropertiesService.getScriptProperties().getProperty('DBSTRING');
var USER = JSON.parse(PropertiesService.getUserProperties().getProperty('currentUser'));



function processProposalSubmission(formObj){
  var test, programId, userObj, user, school, newQueue, programQuery, programDataQuery, querryArray, newId, html;

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
  
  query = 'SELECT * FROM Programs p INNER JOIN Program_Data d ON p.program_id = d.program_id WHERE p.program_id = "'
        + program_id + '"';
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
  html.role = queue[0].queue;

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
    var query = 'SELECT * FROM Programs p INNER JOIN Program_Data d on p.program_id = d.program_id WHERE (d.queue = "'
      + e + '") AND (p.school = "' + school + '")';
    return NVGAS.getSqlRecords(dbString, query);
  }).reduce(function(e){
    return e;
  }));

  CacheService.getUserCache().put('rolePrograms', programs);
  return programs;
}