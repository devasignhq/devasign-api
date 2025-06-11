<br/>
<div align="center">
  <a href="https://www.devasign.com" style="display: block; margin: 0 auto;">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./public/readme-cover-nobg.png">
      <source media="(prefers-color-scheme: light)" srcset="./public/readme-cover.png">
      <img alt="DevAsign Logo" src="./public/readme-cover-nobg.png" height="80" style="display: block; margin: 0 auto;">
    </picture>
  </a>
<br/>

<br/>

<p align="center">
  Backed by <a href="https://communityfund.stellar.org/" style="margin-left: 10px;"><img src="https://devasign.com/assets/scf%20logo-39ec023b.svg" alt="Stellar Community Fund" align="center" /></a>
</p>

</div>

DevAsign streamlines open-source project management by automating contributor payments and intelligently handling pull requests with advanced AI review.

The features that distinguish DevAsign from similar systems are:

* **Automated Payments:** Payments are global and instantaneous
* **Smart Merge:** Prioritize and merge PRs based on project impact and contributor reliability.
* **Custom Workflows:** Configure project-specific rules and thresholds for automated decisions.

## Architecture overview

![Architecture overview](/public/devasign-user-flow_(MVP).png)

## Installation

You can run the devasign api locally with the following commands:

```bash
git clone https://github.com/devasignhq/devasign-api.git
cd devasign-api
npm install
npm run p-gen
npx prisma migrate dev --name migration_name
npm run dev
```

*Note: Setup a PostgreSQL database, a Firebase app, and configure environment variaables after completing the fourth step.*

## Community

[Join our Discord!](https://discord.com/channels/1335941257155055688/1335941257641328743) We are here to answer questions and help you get the most out of DevAsign.

## Contributing

We welcome community contributions. For guidelines, refer to our [CONTRIBUTING.md](/CONTRIBUTING.md).
