const ldap = require('ldapjs')
const nodemailer = require('nodemailer')
const mustache = require('mustache')
const passwordGenerator = require('generate-password')
const basicAuth = require('express-basic-auth')
const { readFileSync } = require('fs')
const { promisify } = require('util')

require('dotenv').config()

const ldapClient = ldap.createClient({
  url: process.env.LDAP_SERVER
})
ldapClient.bindAsync = promisify(ldapClient.bind)
ldapClient.unbindAsync = promisify(ldapClient.unbind)
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

async function validate (email) {
  if (!/.@./.test(email)) {
    return false
  }
  if (/@(outlook|hotmail|live|msn|passport)\./.test(email)) {
    return false
  }
  return true
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
    await ldapClient.unbind()
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

const express = require('express')
const app = express()
const port = 3000

app.use(basicAuth({
  users: {
    'admin': process.env.ADMIN_PASSWORD
  },
  challenge: true
}))

app.get('/create-member', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.query
    const body = mustache.render(readFileSync('web.mu', 'utf-8'), { firstName, lastName, email })
    res.status(200).header('Content-Type', 'text/html; charset=utf-8').send(body)
  } catch (e) {
    console.error(e)
    res.status(500).send(e.message)
  }
})

app.post('/create-member', async (req, res) => {
  try {
    const { firstName, lastName, email: privateEmail } = req.query

    if (!validate(privateEmail)) {
      throw new Error('Invalid email address')
    }

    const { email, password } = await createLdapLogin(firstName, lastName)

    await sendWelcomeEmail(privateEmail, firstName, lastName, email, password)

    res.status(200).send('OK')
  } catch (e) {
    console.error(e)
    res.status(500).send(`Failed\n${e.message}`)
  }
})

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})

ldapClient.on('connect', () => {
  console.log('LDAP connected')
})
ldapClient.on('error', e => console.error(e))
