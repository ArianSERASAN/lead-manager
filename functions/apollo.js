export async function callApolloPeopleEnrich(apiKey, email, firstName, lastName, domain) {
  const body = {};
  if (email) body.email = email;
  if (firstName) body.first_name = firstName;
  if (lastName) body.last_name = lastName;
  if (domain) body.domain = domain;
  body.reveal_personal_emails = false;
  body.reveal_phone_number = false;

  const res = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo People API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function callApolloOrgEnrich(apiKey, domain) {
  if (!domain) return null;

  const url = new URL('https://api.apollo.io/api/v1/organizations/enrich');
  url.searchParams.set('domain', domain);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!res.ok) {
    console.warn(`Apollo Org API error ${res.status} for domain ${domain}`);
    return null;
  }

  return res.json();
}

export function buildEnrichmentData(personRes, orgRes) {
  const person = personRes?.person || {};
  const org = person?.organization || orgRes?.organization || {};

  return {
    apolloId: person.id || null,
    firstName: person.first_name || null,
    lastName: person.last_name || null,
    title: person.title || null,
    headline: person.headline || null,
    linkedinUrl: person.linkedin_url || null,
    photoUrl: person.photo_url || null,
    city: person.city || null,
    state: person.state || null,
    country: person.country || null,
    seniority: person.seniority || null,
    departments: person.departments || [],
    organizationName: org.name || null,
    organizationDomain: org.primary_domain || null,
    organizationWebsite: org.website_url || null,
    organizationIndustry: org.industry || null,
    organizationLinkedin: org.linkedin_url || null,
    organizationSize: org.estimated_num_employees || null,
    organizationFoundedYear: org.founded_year || null,
    organizationRevenue: org.annual_revenue || null,
    organizationFunding: org.total_funding || null,
    organizationFundingStage: org.latest_funding_stage || null,
    source: 'apollo',
    matchConfidence: person.email_status || null,
  };
}
