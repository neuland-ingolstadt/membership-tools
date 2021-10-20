<!DOCTYPE html>
<html>
    <head>
        <title>Mitglied erstellen</title>
    </head>
    <body>
        <h1>Mitglied anlegen</h1>
        <form method="post" action="/create-member">
            Vorname: <br />
            <input type="text" name="firstName" value="{{firstName}}" /> <br />
            Nachname: <br />
            <input type="text" name="lastName" value="{{lastName}}" /> <br />
            E-Mail: <br />
            <input type="email" name="email" value="{{email}}"> <br />
            <button type="submit">Anlegen</button>
        </form>
    </body>
</html>
