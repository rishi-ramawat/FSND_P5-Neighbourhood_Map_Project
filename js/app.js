var map;
var clientID = "CAOMRZA30RBJAL3WNRKF5OHRXM1DWM2SXOV41QJK1RZ1UXJG";
var clientSecret = "P5H3TR025KU1FVLMAUE4GYVPDSTD2HWYPX0DXZSTVA3WQMWW";
var infoWindow;

/* globals google: false */
/* globals ko: false */
/* globals jQuery: false */

var initialLocations = [
    {
        lat: 17.406237,
        lng: 78.46906,
        name: 'Birla Mandir',
        label: 'BM'
    },
    {
        lat: 17.403349,
        lng: 78.470726,
        name: 'Birla Science Museum',
        label: 'BSM'
    },
    {
        lat: 17.415566,
        lng: 78.474973,
        name: 'Buddha Statue of Hyderabad',
        label: 'BS'
    },
    {
        lat: 17.361564,
        lng: 78.474665,
        name: 'Charminar',
        label: 'C'
    },
    {
        lat: 17.357823,
        lng: 78.47169,
        name: 'Chowmahalla Palace',
        label: 'CP'
    },
    {
        lat: 17.383309,
        lng: 78.401053,
        name: 'Golkonda Fort',
        label: 'GF'
    },
    {
        lat: 17.415156,
        lng: 78.426207,
        name: 'Jagannath Temple',
        label: 'JT'
    },
    {
        lat: 17.348305,
        lng: 78.442511,
        name: 'Nehru Zoological Park',
        label: 'NZP'
    },
    {
        lat: 17.254301,
        lng: 78.680767,
        name: 'Ramoji Film City',
        label: 'RFC'
    },
    {
        lat: 17.371356,
        lng: 78.480365,
        name: 'Salar Jung Museum',
        label: 'SJM'
    },
    {
        lat: 17.266838,
        lng: 78.675871,
        name: 'Sanghi Temple',
        label: 'ST'
    },
    {
        lat: 17.414571,
        lng: 78.480923,
        name: 'Snow World',
        label: 'SW'
    },
    {
        lat: 17.215986,
        lng: 78.527495,
        name: 'Wonderla Amusement Park',
        label: 'WAP'
    }
];

var Location = function(location) {
    var self = this;
    this.name = location.name;
    this.label = location.label;
    this.lat = location.lat;
    this.lng = location.lng;
    this.LatLng = new google.maps.LatLng(this.lat, this.lng);
    this.category = '';
    this.URL = '';
    this.street = '';
    this.city = '';
    this.phone = '';

    this.visible = ko.observable(true);
    this.favourite = ko.observable(false);

    var foursquareURL = 'https://api.foursquare.com/v2/venues/search?ll=' +
        this.lat + ',' + this.lng +
        '&client_id=' + clientID +
        '&client_secret=' + clientSecret +
        '&v=20180305' +
        '&query=' + this.name +
        '&limit=1';

    jQuery.getJSON(foursquareURL).done(function(data) {
        var results = data.response.venues[0];
        if (results) {
            self.URL = results.url || '';
            self.street = results.location.formattedAddress[0];
            self.city = results.location.formattedAddress[1];
            self.phone = results.contact.phone;
            self.category = results.categories[0].name;
        }
    }).fail(function() {
        alert("There was an error with the Foursquare API call. Please refresh the page and try again to load Foursquare data.");
    });

    this.marker = new google.maps.Marker({
        position: self.LatLng,
        map: map,
        label: self.label,
        title: self.name
    });

    this.showMarker = ko.computed(function () {
        if (self.visible() === false) {
            self.marker.setMap(null);

            return false;
        }
        self.marker.setMap(map);

        return true;
    }, self);

    this.content = '<article><h4>' + self.name + '</h4>' +
        '<p>' + self.category + '</p>' +
        '<p><a href="' + self.URL + '">' + self.URL + '</a></p>' +
        '<p>' + self.street + ', ' + self.city + '</p>' +
        '<p><a href="tel:' + self.phone + '">' + self.phone + '</a></p>' +
        '</article>';

    this.marker.addListener('click', function() {
        infoWindow.close();

        var streetViewUrl = 'https://maps.googleapis.com/maps/api/streetview?size=600x300&location=' + self.lat + ',' + self.lng + '&key=AIzaSyDpNhBg_oGC78A7BAP-aYJ3lKKyfI2AeuY';

        self.content = '<article><h4>' + self.name + '</h4>' +
        '<p>' + self.category + '</p>' +
        '<p><a href="' + self.URL + '">' + self.URL + '</a></p>';

        if (self.street) {
            self.content += '<p>' + self.street;
            if (self.city) {
                self.content += ', ' + self.city;
            }
            self.content += '</p>';
        }

        if (self.phone) {
            self.content += '<p><a href="tel:' + self.phone + '">' + self.phone + '</a></p>';
        }
        self.content += '<p><img class="street-view-image" src="' + streetViewUrl + '"></p>';
        self.content += '</article>';

        infoWindow.setContent(self.content);
        infoWindow.open(map, self.marker);

        self.bounceMarker();
    });

    this.bounceMarker = function() {
        self.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            self.marker.setAnimation(null);
        }, 2000);
    };

    this.openInfoWindow = function(location) {
        new google.maps.event.trigger(location.marker, 'click');
    };

    this.toggleFavourite = function(location) {
        location.favourite(!location.favourite());
    };
};

var ViewModel = function() {
    var self = this;

    this.searchKeyword = ko.observable('');

    this.locationsList = ko.observableArray([]);
    initialLocations.forEach(function(locationItem) {
        self.locationsList.push(new Location(locationItem));
    });

    this.filteredList = ko.computed(function() {
        var filter = self.searchKeyword().toLowerCase();
        var bounds = new google.maps.LatLngBounds();
        if (!filter) {
            self.locationsList().forEach(function(location) {
                location.visible(true);
                bounds.extend(location.LatLng);
            });
            map.fitBounds(bounds);

            return self.locationsList();
        }

        var locations = ko.utils.arrayFilter(self.locationsList(), function(location) {
            var locationName = location.name.toLowerCase();
            var visible = (locationName.search(filter) >= 0);
            location.visible(visible);
            bounds.extend(location.LatLng);

            return visible;
        });
        map.fitBounds(bounds);

        return locations;
    }, self);
};

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: {lat:17.285, lng:78.486}
    });
    infoWindow = new google.maps.InfoWindow({});

    ko.applyBindings(new ViewModel());
}

function errorHandling() {
    alert("Google Maps has failed to load. Please check your internet connection and try again.");
}
