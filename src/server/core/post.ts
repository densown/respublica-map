import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  const post = await reddit.submitCustomPost({
    title: 'World Atlas',
  });
  try {
    await post.sticky(1);
  } catch {
    console.log('Could not sticky post (may lack permissions)');
  }
  return post;
};
