// 
// Aiwip - Copyright Aiwip 2017
//   
// Aiwip Print Station Push Update Script
//

const ip_addresses = ["10.8.0.10", "10.8.0.12"]
const nameservers = "nameserver 8.8.8.8\n\
nameserver 8.8.4.4"

function loginDetails(username, ip_address) {
    return "root@$ip_address"
}

function runCommand(ip_address, cmd) {
    const login = loginDetails("root", ip_address)
    echo(login, cmd)
    ssh(login, cmd)
}

for (var ip_address in ip_addresses) {
    echo("Updating", ip_address)

    echo("Setting up Google Nameservers...")
    runCommand(ip_address, "echo $nameservers > /etc/resolv.conf")

    echo("Specify to use Google Nameservers...")
    runCommand(ip_address, "uci set dhcp.@dnsmasq[-1].resolvfile=/tmp/resolv.conf && uci commit dhcp")

    echo("Restarting dnsmasq...")
    runCommand(ip_address, ". /etc/init.d/dnsmasq restart")

    echo("Disabling update verification")
    runCommand(ip_address, "sed -i '$ d' /etc/opkg.conf")

    echo("Updating Packages")
    runCommand(ip_address, "opkg update")

    echo("Upgrading print-station package")
    runCommand(ip_address, "opkg upgrade print-station")

    echo("Register Printers")
    runCommand(ip_address, "aiwip printer-check")

    echo("Enabling update verification")
    runCommand(ip_address, "echo 'option check_signature 1' >> /etc/opkg.conf")
}

echo("Updated", ip_addresses)