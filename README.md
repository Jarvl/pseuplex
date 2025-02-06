# Pseuplex

A middleware proxy for the plex server API. This sits in between the plex client and the plex server, forwarding requests and modifying responses to add some extra features.

Inspired by [Replex](https://github.com/lostb1t/replex)

This project is still very much a WIP and it is not recommended to enable remote access yet.

## Features

- ### Similar Films on Letterboxd

	Instead of only showing related movies from your server, you can show the list of similar movies from letterboxd

	![Similar Films on Letterboxd](docs/images/letterboxd_similar.png)

	For movies that aren't available on your server, the "unavailable" status will appear on the film page.

	![Unavailable](docs/images/unavailable.png)

	**Note**: The unavailable status will not show on the Roku client or any other client that doesn't subscribe to the plex server websocket.

- ### Letterboxd Friends Activity

	Activity from your letterboxd friends can be displayed on the server home page. Different users on your server can be configured to display their own friend feeds.

	![Letterboxd Friends Activity Feed](docs/images/letterboxd_friends_hub.png)

- ### Letterboxd Friends Reviews

	Reviews from your letterboxd friends can be included alongside the RottenTomatoes reviews

	![Letterboxd Friends Reviews](docs/images/letterboxd_friends_reviews.png)

## Setup

### SSL

You must use your own SSL certificate for your plex server in order for pseuplex to modify requests over HTTPS. Otherwise, pseuplex will only work over HTTP, or it will fallback to the plex server's true address instead of the proxy address.

### Configuration

Create a `config.json` file with the following structure, and fill in the configuration for your setup:

```json
{
	"port": 32397,
	"plex": {
		"serverURL": "http://127.0.0.1:32400",
		"token": "<PLEX API TOKEN>"
	},
	"ssl": {
		"keyPath": "/etc/pseuplex/ssl_cert.key",
		"certPath": "/etc/pseuplex/ssl_cert.crt"
	},
	"perUser": {
		"yourplexuseremail@example.com": {
			"letterboxdUsername": "<LETTERBOXD USERNAME>"
		}
	}
}
```

- **protocol**: The server protocol. Either `http`, `https`, or `http+https` (default is `http+https`)
- **port**: The port that Pseuplex will run on
- **plex.port**: The port of your plex server (Usually 32400)
- **plex.host**: The url of your plex server, not including the port.
- **plex.token**: The plex API token of the server owner.
- **ssl.keyPath**: The path to your SSL private key
- **ssl.certPath**: The path to your SSL certificate
- **perUser**: A map of settings to configure for each user on your server. The entry keys are the plex email for each the user.
	- **letterboxdUsername**: The letterboxd username for this user
 	- **letterboxdSimilarItemsEnabled**: (*optional*) Display similar items from letterboxd on plex media item pages for this user
  	- **letterboxdFriendsActivityHubEnabled**: (*optional*) Display the letterboxd friends activity hub on the home page for this user
  	- **letterboxdFriendsReviewsEnabled**: (*optional*) Display letterboxd friends reviews for this user
- **letterboxdSimilarItemsEnabled**: (*optional*) Display similar items from letterboxd on plex media item pages for all users
- **letterboxdFriendsActivityHubEnabled**: (*optional*) Display the letterboxd friends activity hub on the home page for all users
- **letterboxdFriendsReviewsEnabled**: (*optional*) Display letterboxd friends reviews for all users

### Network Settings

Once you have generated your own SSL certificate, configure your server's [Network settings](https://support.plex.tv/articles/200430283-network/) to use it.

![Plex SSL Prefs](docs/images/plex_ssl_prefs.png)

In the *Custom server access URLs* field, put the URLs of your pseuplex server, separated by commas.

![Plex Server URLs](docs/images/plex_server_urls.png)

Ensure *Enable local network discovery (GDM)* and *Enable Relay* are both unchecked, and then save the changes to your server's network settings.

At this point, your plex server might not show up on *app.plex.tv* until you start pseuplex, but you should still be able to access it via its local ip.

### Local Access

If you're using a custom domain name for your SSL certificate, you can hardcode the DNS entry mapping on your home router (or pihole if you have it). This way your domain will always resolve to the local ip when accessing via your local network (ie: map `yourdomain.com` to `192.168.1.123` or whatever the local IP of your pseuplex server is).

### Remote Access

If you want to enable pseuplex for remote access, you'll need to port forward your pseuplex proxy instead of your plex server.

### Running

To run, cd into this repo's folder in terminal and run the following commands, replacing the config.json path with your own:

```sh
npm install
npm start -- --config="/path/to/config.json"
```
