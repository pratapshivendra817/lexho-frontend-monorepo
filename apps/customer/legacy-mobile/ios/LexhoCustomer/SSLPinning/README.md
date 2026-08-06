Place iOS SSL pinning certificate files in this folder and add them to the Xcode target.

Expected default filename:

- `lexho_api.cer`

Steps after adding the file:

1. Open `ios/LexhoCustomer.xcworkspace` in Xcode.
2. Add the `.cer` file to the `LexhoCustomer` target.
3. Confirm the file is included in `Copy Bundle Resources`.
4. Keep the cert name aligned with `SSL_PINNING_CERT_NAME` in `.env`.
