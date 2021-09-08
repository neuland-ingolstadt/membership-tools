const readline = require('readline')
const ldap = require('ldapjs')
const nodemailer = require('nodemailer')
const mustache = require('mustache')
const passwordGenerator = require('generate-password')
const { readFileSync } = require('fs')
const { promisify } = require('util')

require('dotenv').config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
rl.questionAsync = question => new Promise(resolve => rl.question(question, resolve))

const ldapClient = ldap.createClient({
  url: process.env.LDAP_SERVER
})
ldapClient.bindAsync = promisify(ldapClient.bind)
ldapClient.addAsync = promisify(ldapClient.add)

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

function normalize (str) {
  return str.trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/ /g, '.')
}

async function createLdapLogin (firstName, lastName) {
  await ldapClient.bindAsync(process.env.LDAP_BIND_CN, process.env.LDAP_BIND_PASSWORD)

  try {
    const cn = `${normalize(firstName)}.${normalize(lastName)}`
    const dn = `cn=${cn},${process.env.LDAP_USER_CN}`
    const email = `${cn}@neuland-ingolstadt.de`
    const password = passwordGenerator.generate({ length: 12, lowercase: true, uppercase: true, numbers: true })

    console.log('Creating LDAP account ...')
    const entry = {
      cn: cn,
      givenName: firstName,
      sn: lastName,
      displayName: `${firstName} ${lastName}`,
      userPassword: password,
      mail: email,
      mailEnabled: 'TRUE',
      objectClass: [
        'inetOrgPerson',
        'PostfixBookMailAccount'
      ]
    }
    await ldapClient.addAsync(dn, entry)

    return { email, password }
  } finally {
    ldapClient.destroy()
  }
}

async function sendWelcomeEmail (privateEmail, firstName, lastName, email, password) {
  const body = mustache.render(readFileSync('email.mu', 'utf-8'), { firstName, lastName, email, password })
  console.log('Sending email ...')
  await transporter.sendMail({
    from: 'Neuland Ingolstadt e.V. <noreply@neuland-ingolstadt.de>',
    to: `${firstName} ${lastName} <${privateEmail}>`,
    subject: 'Willkommen bei Neuland Ingolstadt',
    html: body
  })
}

async function main () {
  console.log('Collecting information for LDAP account ...')
  const firstName = (await rl.questionAsync('First name: ')).trim()
  const lastName = (await rl.questionAsync('Last name: ')).trim()
  const privateEmail = (await rl.questionAsync('Private Email: ')).trim()

  const { email, password } = await createLdapLogin(firstName, lastName)
  //const { email, password } = { email: 'test@example.com', password: 'yeet' }

  console.log('LDAP account created.')

  await sendWelcomeEmail(privateEmail, firstName, lastName, email, password)

  console.log('Welcome email sent.')

  rl.close()
}

ldapClient.on('connect', () => main().catch(console.error))
ldapClient.on('error', e => console.error(e))
