import pkg from 'pg';
const { Client } = pkg;

const regions = [
  "sa-east-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "ap-southeast-1"
];

const pass = "Bt%26e%26mjr%2BntE5_6";
const ref = "ocqzcqqpfqpojbbxellq";

async function testRegions() {
  for (const region of regions) {
    const url = `postgresql://postgres.${ref}:${pass}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      console.log(`✅ SUCCESS! Found your database in region: ${region}`);
      console.log(`URL: ${url}`);
      await client.end();
      return url;
    } catch (e) {
      console.log(`❌ Failed in ${region}: ${e.message}`);
    }
  }
  console.log("Could not find the region.");
}

testRegions();
