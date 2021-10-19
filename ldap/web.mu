<!DOCTYPE html>
<html>
    <head>
        <title>Mitglied erstellen</title>
    </head>
    <body>
        <form method="post">
            Vorname: <br />
            <input type="text" name="firstName" value="{{firstName}}" /> <br />
            Nachname: <br />
            <input type="text" name="lastName" value="{{lastName}}" /> <br />
            E-Mail: <br />
            <input type="email" name="email" value="{{email}}"> <br />
            <button type="submit">Erstellen</button>
        </form>
    </body>
</html>