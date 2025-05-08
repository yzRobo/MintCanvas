//src/pages/Home.jsx

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const Home = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Welcome to Your NFT Gallery</h2>
      <p className="text-xl text-muted-foreground">Explore and manage your unique digital art collection.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Art Gallery</CardTitle>
            <CardDescription>Explore the collection of minted NFTs</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Browse through the gallery to see all the minted NFTs and their details.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mint NFTs</CardTitle>
            <CardDescription>Create new items in your NFT collection</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Use our minting interface to create new NFTs. Only authorized minters can perform this action.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;