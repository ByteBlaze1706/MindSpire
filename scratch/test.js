const regex = /(from\s+['"])(\.\.\/(?:\.\.\/)+)([^'"]+['"])/g;
const str = "import { CommunityPost, createPostAction } from '../../../lib/actions/community.actions';";
const res = str.replace(regex, (match, prefix, dots, suffix) => {
  const count = dots.split('../').length - 1;
  console.log('dots:', dots);
  console.log('count:', count);
  console.log('newDots:', '../'.repeat(count - 1));
  return `${prefix}${ '../'.repeat(count - 1) }${suffix}`;
});
console.log('Result:', res);
