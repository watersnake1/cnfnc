# NFNC (Browser Edition)

## Future TODOs
- More features for the soulbound NFTs
    - Add an option for an expiration date
        - At expiration, the token is no longer valid and can be burned
        - ? a payment could potentially be used to 'renew' the token
        - Since the user could theoretically move the nft right after they mint the badge, an expiration is important. The most general case is that new badges are created as-needed, and are used like a one time token or something
        - Long duration badges would be less useful probably
    - Badges carry the contract address of the NFT collection they represent in their metadata
- NFTProverFactory
    - New page on the frontend
    - "Create a new gate"
    - Someone can designate an NFT contract that they want to have this functionality enabled for
    - The app will then generate and compile a new zk proof for this specific NFT contract and deploy it
    - There will be a directory page on the frontend that shows all the supported collections
- Upgradability
    - Use upgradable proxies for the factory contract so that we can continue to roll new features into the system
- Monetization
    - The protocol takes a fee when new token gates are created, and each badge also contains a mint fee that goes back to the treasury