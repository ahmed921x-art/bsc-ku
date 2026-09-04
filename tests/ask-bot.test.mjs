import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COHORT_KB } from "../cohort-knowledge.js";

const cohorts = ["2019", "2020", "2021", "2022", "2023", "2024", "2025"];
const majors = ["animal", "plant", "micro", "biochem", "molecular"];
const courses = COHORT_KB.filter(item => item.kind === "course");
const plans = COHORT_KB.filter(item => item.kind === "plan");

for (const cohort of cohorts) {
  assert.equal(plans.filter(item => item.cohort === cohort).length, majors.length, `plans for ${cohort}`);
  assert.ok(courses.some(item => item.cohort === cohort), `courses for ${cohort}`);
}

for (const course of courses) {
  assert.match(course.courseCode, /^\d{7}$/);
  assert.ok(course.courseName);
  assert.ok(course.prerequisites);
  assert.ok(course.cohort);
}

const duplicateCourseKeys = courses
  .map(item => `${item.cohort}:${item.majorKey}:${item.courseCode}`)
  .filter((key, index, all) => all.indexOf(key) !== index);
assert.deepEqual([...new Set(duplicateCourseKeys)], [], "duplicate cohort course records");

const askSource = await readFile(new URL("../ask.html", import.meta.url), "utf8");
for (const feature of [
  "addCohortPrompt",
  "addMajorPrompt",
  "academicAnswer",
  "asksWhatOpens",
  "isOrphanCourseFollowup",
  "bsc_active_course",
  "advisorAnswer",
  "ADVISOR_FALLBACKS",
  "redirectedToAdvisor",
]) assert.ok(askSource.includes(feature), `missing bot feature: ${feature}`);

for (const advisor of [
  ["animal", "amani.alzaidan@ku.edu.kw"],
  ["plant", "ahlam.bouariky@ku.edu.kw"],
  ["micro", "dunia.algharabally@ku.edu.kw"],
  ["biochem", "haya.alreshidi@ku.edu.kw"],
  ["molecular", "abbas.alameer@ku.edu.kw"],
]) {
  assert.ok(askSource.includes(`major:"${advisor[0]}"`), `missing advisor major: ${advisor[0]}`);
  assert.ok(askSource.includes(advisor[1]), `missing advisor email: ${advisor[1]}`);
}

for (const schedulePhrase of ["schedule", "شنو اخذ", "الفصل الجاي", "رتب", "وزع"]) {
  assert.ok(askSource.includes(schedulePhrase), `missing schedule guard phrase: ${schedulePhrase}`);
}

console.log(`Ask Club bot checks passed: ${COHORT_KB.length} cohort entries, ${courses.length} course records.`);
