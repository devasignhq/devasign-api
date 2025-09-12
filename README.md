<br/>
<div align="center">
  <a href="https://www.devasign.com" style="display: block; margin: 0 auto;">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./public/devasign-white.png">
      <source media="(prefers-color-scheme: light)" srcset="./public/devasign-black.png">
      <img alt="DevAsign Logo" src="./public/devasign-white.png" height="120" style="display: block; margin: 0 auto;">
    </picture>
  </a>
<br/>

<br/>

</div>

<br/>

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
npm run prisma-gen-acc
npx prisma migrate dev --name migration_name
npm run dev
```

*Note: Setup a PostgreSQL database, a Firebase app, and configure environment variaables after completing the fourth step.*

## Community

[Join our Discord!](https://discord.com/channels/1335941257155055688/1335941257641328743) We are here to answer questions and help you get the most out of DevAsign.

## Contributing

We welcome community contributions. For guidelines, refer to our [CONTRIBUTING.md](/CONTRIBUTING.md).

## License

Apache 2.0, see [LICENSE](https://github.com/devasignhq/devasign-api/blob/main/LICENSE).
