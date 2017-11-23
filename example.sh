#!/bin/sh
ip_addresses=("10.8.0.10" "10.8.0.12")
nameservers="nameserver 8.8.8.8
nameserver 8.8.4.4"
loginDetails () {
username=$1
ip_address=$2
RETURN="root@$ip_address"
}
runCommand () {
ip_address=$1
cmd=$2
loginDetails "root" $ip_address
login=$RETURN
echo loginDetails "root" $ip_address $cmd
ssh $login $cmd
}
for ip_address in ${ip_addresses[@]}
do
echo "Updating" $ip_address
echo "Setting up Google Nameservers..."
runCommand $ip_address "echo $nameservers > /etc/resolv.conf"
echo "Specify to use Google Nameservers..."
runCommand $ip_address "uci set dhcp.@dnsmasq[-1].resolvfile=/tmp/resolv.conf && uci commit dhcp"
echo "Restarting dnsmasq..."
runCommand $ip_address ". /etc/init.d/dnsmasq restart"
echo "Disabling update verification"
runCommand $ip_address "sed -i '$ d' /etc/opkg.conf"
echo "Updating Packages"
runCommand $ip_address "opkg update"
echo "Upgrading print-station package"
runCommand $ip_address "opkg upgrade print-station"
echo "Register Printers"
runCommand $ip_address "aiwip printer-check"
echo "Enabling update verification"
runCommand $ip_address "echo 'option check_signature 1' >> /etc/opkg.conf"
done
echo "Updated" ${ip_addresses[@]}
