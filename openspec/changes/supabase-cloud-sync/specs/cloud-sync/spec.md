## ADDED Requirements

### Requirement: Account and sign-in
The app SHALL identify a user by an email magic link, and SHALL keep the session across app launches until the user signs out.

#### Scenario: First sign-in
- **WHEN** a signed-out user enters their email address
- **THEN** a sign-in link is sent to that address
- **AND** opening the link signs them in and returns them to the app

#### Scenario: Returning to the app
- **WHEN** a previously signed-in user opens the app
- **THEN** they are still signed in, without re-entering their email

#### Scenario: Using the app before signing in
- **WHEN** a user has not signed in
- **THEN** the app still works fully against local storage
- **AND** a prompt explains that data stays on this device until they sign in

### Requirement: Data follows the account
Bakeries, visits, want-to-try entries, notes and preferences SHALL be stored per user on the server, and SHALL be identical on every browser and device that signs in.

#### Scenario: Second browser
- **GIVEN** a user has ranked bakeries in one browser
- **WHEN** they sign in on a different browser
- **THEN** the same bakeries, rankings, visits and photos are present

#### Scenario: A user only ever sees their own rows
- **WHEN** any read or write reaches the database
- **THEN** row-level security restricts it to rows owned by the signed-in user

### Requirement: Photos live in cloud storage
A bakery photo SHALL be uploaded to the server and referenced by URL, not embedded in the local state.

#### Scenario: Adding a photo
- **WHEN** a signed-in user picks a photo for a bakery
- **THEN** the image is uploaded to the user's storage bucket
- **AND** the bakery row keeps the resulting URL

#### Scenario: Photos stop consuming the local budget
- **WHEN** photos have been migrated to cloud storage
- **THEN** local storage no longer holds image data for those bakeries

#### Scenario: Offline photo pick
- **WHEN** a user adds a photo with no connection
- **THEN** the photo is held locally and uploaded once a connection returns

### Requirement: Offline-first writes
The app SHALL accept every change immediately without waiting for the network, and SHALL send queued changes when a connection is available.

#### Scenario: Logging a visit on a plane
- **WHEN** a signed-in user logs a visit with no connection
- **THEN** the visit appears in the app straight away
- **AND** it is queued for the server

#### Scenario: Coming back online
- **WHEN** a connection returns and queued changes exist
- **THEN** they are sent in order
- **AND** a change that has already been applied is not duplicated

#### Scenario: The same bakery edited on two devices
- **WHEN** two devices have edited the same bakery while offline
- **THEN** the most recently updated version wins
- **AND** neither device is left showing a version the server rejected

### Requirement: Existing data survives the move
The first sign-in on a browser holding local data SHALL upload that data rather than discard it or duplicate it.

#### Scenario: First sign-in with existing local data
- **GIVEN** this browser holds bakeries created before there were accounts
- **WHEN** the user signs in for the first time
- **THEN** those bakeries, visits and photos are uploaded to their account
- **AND** the local copy is left in place until the server confirms

#### Scenario: Migration is not repeated
- **WHEN** a browser that has already migrated signs in again
- **THEN** no duplicate bakeries are created

### Requirement: Secrets stay out of the repository
The browser bundle SHALL contain only the Supabase project URL and anon key, and the repository SHALL never contain a service role key.

#### Scenario: Configuring the app
- **WHEN** the app is built
- **THEN** it reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from a gitignored `.env`
