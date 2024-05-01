#!/usr/bin/env node

"use strict";

var jsforce = require("jsforce");

if (!process.env.GIT_SHA) {
  console.error(
    "GIT_SHA is a required environment variable so the build is named"
  );
  process.exit(1);
}

console.debug = console.log;

let conn = new jsforce.Connection({
  loginUrl: process.env.SALESFORCE_URL || "https://login.salesforce.com",
});

let PackageUploadRequest = conn.tooling.sobject("PackageUploadRequest");
let MetadataPackage = conn.tooling.sobject("MetadataPackage");
let MetadataPackageVersion = conn.tooling.sobject("MetadataPackageVersion");

conn
  .login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD)
  .then((userInfo) => {
    return MetadataPackage.find()
      .then((res) => {
        if (res.length != 1) {
          console.error("org should only have one package");
          process.exit(1);
        } else {
          return res[0].Id;
        }
      })
      .then((id) => {
        return PackageUploadRequest.create({
          MetadataPackageId: id,
          IsReleaseVersion: false, // only automatically create beta versions so we don't bork it permanently
          VersionName: process.env.GIT_SHA || "unknown git sha",
        });
        // return {id: '0HDf4000000CaTNGA0'} // debug
      })
      .then((res) => {
        console.log("***** package submitted *****");
        console.log(res);
        return waitUntilUploaded(res.id);
      })
      .then((req) => {
        console.log("***** package upload request full details ****");
        console.log(req);
        if (req.Status != "SUCCESS") {
          throw new Error(
            "PACKAGE UPLOAD ERROR: " + JSON.stringify(req.Errors)
          );
        }
        return MetadataPackageVersion.find({
          Id: req.MetadataPackageVersionId,
        });
      })
      .then((res) => {
        console.log("***** package uploaded *****");
        console.log(res);
        console.log(
          "INSTALL URL: /packaging/installPackage.apexp?p0=" + res[0].Id
        );
        // TODO put the url somewhere so people can test it?
      });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

function wait(msToWait) {
  return new Promise((resolve) => setTimeout(resolve, msToWait));
}

function waitUntilUploaded(id) {
  // check every second until done
  console.log("Checking in 1 second for " + id);
  return wait(1000)
    .then((_) => {
      return PackageUploadRequest.retrieve(id);
    })
    .then((res) => {
      // console.log(res)
      console.log("Status:", res.Status);
      if (res.Status == undefined) {
        throw new Error("Status not found on " + res);
      } else if (res.Status == "IN_PROGRESS" || res.Status == "QUEUED") {
        console.log("Checking again... status:", res.Status);
        return waitUntilUploaded(id);
      } else {
        return res;
      }
    });
}

function describeObject(objectName) {
  return conn.tooling
    .sobject(objectName)
    .describe()
    .then((meta) => {
      console.log(meta);
      meta.fields.map((f) => console.log(f.name));
    });
}
