import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, Eye } from "lucide-react";
import { motion } from "framer-motion";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImage: string | null;
  publishedAt: string | null;
  views: number;
  authorId: string | null;
}

export default function BlogPage() {
  const [, setLocation] = useLocation();

  const { data: blogs = [], isLoading } = useQuery<Blog[]>({
    queryKey: ['/api/blogs'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <span className="text-primary uppercase tracking-[0.2em] text-xs font-bold mb-2 block">The Journal</span>
        <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-4">HOUSES OF MEDUSA BLOG</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover the latest in luxury fashion, style guides, and exclusive insights from our world.
        </p>
      </div>

      {blogs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No blog posts available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog, index) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-card border-white/5 hover:border-primary/50 transition-colors h-full flex flex-col">
                {blog.featuredImage && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={blog.featuredImage}
                      alt={blog.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {blog.publishedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(blog.publishedAt).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {blog.views || 0}
                    </div>
                  </div>
                  <h2 className="font-heading text-xl mb-3 line-clamp-2">{blog.title}</h2>
                  {blog.excerpt && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">{blog.excerpt}</p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setLocation(`/blog/${blog.slug}`)}
                  >
                    Read More <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

