-- 🔍 Code Review Tracker SQL Script
-- This query extracts pending code review requests,
-- categorizes them by size and priority, calculates delay,
-- and outputs a clean table for review/export.

-- STEP 1: Flatten and enrich raw review request data
WITH extracted_data AS (
  SELECT 
    CONCAT("cc/", code_change_id) AS Code_Change_ID,
    UNNEST(issue_ids) AS Issue_ID,
    CASE 
      WHEN total_lines_of_code <= 10 THEN 'XS'
      WHEN total_lines_of_code <= 50 THEN 'S'
      WHEN total_lines_of_code <= 300 THEN 'M'
      WHEN total_lines_of_code <= 1000 THEN 'L'
      ELSE 'XL'
    END AS Size_Category,
    review_status AS Status,
    author AS Author, 
    UNNEST(reviewers) AS Reviewer,
    CASE 
      WHEN review_status = 'PENDING' THEN 
        EXTRACT(DATE FROM TIMESTAMP_MICROS(requested_at_micros) AT TIME ZONE 'UTC') 
    END AS Requested_Review_Date
  FROM 
    code_review_table, 
    UNNEST(issue_ids) AS issue_ids,
    UNNEST(reviewers) AS reviewers
  WHERE 
    author IN (SELECT member_name FROM team_members)
    AND reviewers IN (SELECT member_name FROM team_members)
    AND review_status = 'PENDING'
    AND description NOT LIKE '%non_trackable%'
),

-- STEP 2: Calculate delay (in days) since review was requested
pending_reviews AS (
  SELECT 
    *, 
    DATE_DIFF(CURRENT_DATE(), Requested_Review_Date, DAY) AS Days_Pending
  FROM extracted_data
),

-- STEP 3: Join with issue metadata to assign review urgency
priority_mapping AS (
  SELECT 
    pending_reviews.*, 
    issue_metadata.priority_level,
    issue_metadata.title AS Title,
    CASE 
      WHEN priority_level = 'High' AND Size_Category IN ('XL', 'L') THEN 3
      WHEN priority_level = 'High' AND Size_Category = 'M' THEN 2
      WHEN priority_level = 'High' THEN 1
      WHEN priority_level = 'Medium' AND Size_Category IN ('XL', 'L') THEN 4
      WHEN priority_level = 'Medium' THEN 2
      WHEN priority_level = 'Low' AND Size_Category IN ('XL', 'L') THEN 5
      WHEN priority_level = 'Low' THEN 3
      WHEN priority_level = 'Very Low' AND Size_Category IN ('XL', 'L') THEN 6
      WHEN priority_level = 'Very Low' THEN 4
    END AS Ideal_Review_Days
  FROM 
    pending_reviews
  JOIN 
    issue_metadata
  ON 
    pending_reviews.Issue_ID = issue_metadata.issue_id 
  WHERE
    Reviewer IN (SELECT member_name FROM team_members)
    AND Days_Pending <= 50
),

-- STEP 4: Combine multiple reviewers per code change into one row
final_output AS (
  SELECT 
    Code_Change_ID, 
    Size_Category, 
    CAST(priority_level AS STRING) AS Priority_Level,
    Status, 
    Author, 
    ARRAY_TO_STRING(ARRAY_AGG(DISTINCT Reviewer ORDER BY Reviewer), ', ') AS Reviewer,
    Requested_Review_Date,
    Days_Pending,
    Ideal_Review_Days,
    Title
  FROM 
    priority_mapping
  WHERE 
    Code_Change_ID NOT IN ("cc1", "cc2") 
  GROUP BY 
    Code_Change_ID, Size_Category, Priority_Level, Title, Status, Author, Requested_Review_Date, Days_Pending, Ideal_Review_Days
)

-- STEP 5: Output filtered results for your team
SELECT * FROM final_output
WHERE
  Reviewer NOT IN ('team_lead_1', 'manager_1')
  AND Reviewer IN (
    SELECT member_name FROM team_members WHERE team = "your_team_name"
  );
