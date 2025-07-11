// 📩 sendReminders.gs
// Google Apps Script to read pending code reviews from a Google Sheet,
// send reminder/warning emails based on review delays, and log all actions.

function triggerReviewCheck() {
  const ss = SpreadsheetApp.openByUrl('<<URL_OF_EXPORTED_SHEET>>');  // Replace with your Sheet URL
  const dataSheet = ss.getSheetByName('<<Exported_Data_Sheet>>');    // Replace with your data sheet name
  if (!dataSheet) {
    console.log("❌ Data sheet not found");
    return;
  }

  const values = dataSheet.getDataRange().getValues();
  if (values.length <= 1) {
    console.log("❌ No data to process");
    return;
  }

  processPendingReviews(values, dataSheet);
}

function processPendingReviews(values, dataSheet) {
  const trackerSheet = SpreadsheetApp
    .openByUrl("<<TRACKER_SHEET_URL>>")                      // Replace with your tracker sheet URL
    .getSheetByName("Mail Tracker");                         // Replace with tracker tab name if needed

  if (!trackerSheet) {
    console.log("❌ Mail Tracker sheet not found");
    return;
  }

  const groupedData = {};

  for (let i = 1; i < values.length; i++) {
    const codeChangeId = String(values[i][0]).trim();        // Column A: Code_Change_ID
    const priority = String(values[i][2]).trim();            // Column C: Priority_Level
    const title = String(values[i][3]).trim();               // Column D: Title
    const reviewers = String(values[i][6]).split(',').map(r => r.trim());  // Column G
    const approvers = String(values[i][10]).split(',').map(g => g.trim()); // Column K
    const daysPending = parseInt(values[i][8]) || 0;         // Column I: Days_Pending
    const idealDays = parseInt(values[i][9]) || 0;           // Column J: Ideal_Review_Days

    if (!codeChangeId || reviewers.length === 0) {
      console.log(`⚠️ Skipping row ${i + 1}: Missing ID or reviewers`);
      continue;
    }

    if (!groupedData[codeChangeId]) {
      groupedData[codeChangeId] = {
        reviewers: new Set(),
        approvers: new Set(),
        daysPending,
        idealDays,
        priority,
        title
      };
    }

    reviewers.forEach(r => groupedData[codeChangeId].reviewers.add(r));
    approvers.forEach(g => groupedData[codeChangeId].approvers.add(g));
  }

  let emailsTriggered = false;

  for (let id in groupedData) {
    const {
      reviewers,
      approvers,
      daysPending,
      idealDays,
      priority,
      title
    } = groupedData[id];

    const reviewerList = Array.from(reviewers);
    const approverList = Array.from(approvers);

    for (let reviewer of reviewerList) {
      const isSelfApproved = approverList.includes(reviewer);

      if (isSelfApproved) {
        sendReminderEmail(id, reviewer, priority, title, dataSheet, trackerSheet);
        emailsTriggered = true;
      } else if (daysPending > idealDays) {
        sendWarningEmail(id, reviewer, priority, title, dataSheet, trackerSheet);
        emailsTriggered = true;
      }
    }
  }

  if (!emailsTriggered) {
    console.log("✅ No pending reminders at this time");
  }
}

function sendReminderEmail(id, reviewer, priority, title, dataSheet, trackerSheet) {
  const dateNow = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/dd/yyyy");
  const recipientEmail = reviewer + "@yourdomain.com";  // Replace with your org's domain

  try {
    MailApp.sendEmail({
      to: recipientEmail,
      subject: "Reminder: Code Review Pending",
      htmlBody: `This is a gentle reminder that your code change <b>${id}</b> is pending submission.<br><br><b>Priority:</b> ${priority}<br><b>Title:</b> ${title}`
    });
    console.log(`✅ Reminder sent to: ${recipientEmail}`);
  } catch (error) {
    console.log(`❌ Failed to send to ${recipientEmail}: ${error.message}`);
  }

  logTrigger(id, reviewer, priority, title, dateNow, dataSheet, trackerSheet);
}

function sendWarningEmail(id, reviewer, priority, title, dataSheet, trackerSheet) {
  const dateNow = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/dd/yyyy");
  const recipientEmail = reviewer + "@yourdomain.com";

  try {
    MailApp.sendEmail({
      to: recipientEmail,
      subject: "⚠️ Action Needed: Review Overdue",
      htmlBody: `Your code change <b>${id}</b> is past its review deadline.<br>Please take necessary action.<br><br><b>Priority:</b> ${priority}<br><b>Title:</b> ${title}`
    });
    console.log(`⚠️ Warning sent to: ${recipientEmail}`);
  } catch (error) {
    console.log(`❌ Failed to send to ${recipientEmail}: ${error.message}`);
  }

  logTrigger(id, reviewer, priority, title, dateNow, dataSheet, trackerSheet);
}

function logTrigger(id, reviewer, priority, title, date, dataSheet, trackerSheet) {
  const data = dataSheet.getDataRange().getValues();

  // Log to exported sheet
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id && String(data[i][5]).trim() === reviewer) {
      dataSheet.getRange(i + 1, 11).setValue(date);  // Assuming Column K is log column
      break;
    }
  }

  // Log to "Mail Tracker"
  const logData = trackerSheet.getDataRange().getValues();
  let found = false;

  if (logData.length === 0) {
    trackerSheet.appendRow(['Code_Change_ID', 'Priority', 'Title', 'Reviewer', 'Date_Triggered', 'Trigger_Count']);
  }

  for (let i = 1; i < logData.length; i++) {
    if (logData[i][0] === id && logData[i][3] === reviewer) {
      let currentCount = parseInt(logData[i][5]) || 0;
      trackerSheet.getRange(i + 1, 6).setValue(currentCount + 1);
      found = true;
      break;
    }
  }

  if (!found) {
    trackerSheet.appendRow([id, priority, title, reviewer, date, 1]);
  }
}
