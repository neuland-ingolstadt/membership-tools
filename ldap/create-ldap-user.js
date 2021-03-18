const readline = require('readline')
const ldap = require('ldapjs')
const passwordGenerator = require('generate-password')
const { promisify } = require('util')

require('dotenv').config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
rl.questionAsync = question => new Promise(resolve => rl.question(question, resolve))

const ldapClient = ldap.createClient({
  url: process.env.SERVER
})
ldapClient.bindAsync = promisify(ldapClient.bind)
ldapClient.addAsync = promisify(ldapClient.add)

function normalize (str) {
  return str.trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

async function main () {
  await ldapClient.bindAsync(process.env.BIND_CN, process.env.BIND_PASSWORD)

  console.log('Collecting information for LDAP account ...')
  const firstName = await rl.questionAsync('First name: ')
  const lastName = await rl.questionAsync('Last name: ')

  const cn = `${normalize(firstName)}.${normalize(lastName)}`
  const dn = `cn=${cn},${process.env.USER_CN}`
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

  console.log('LDAP account created.')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)

  ldapClient.destroy()
  rl.close()
}

ldapClient.on('connect', () => main().catch(console.error))
ldapClient.on('error', e => console.error(e))
